import { chromium, type Browser } from 'playwright';
import * as cheerio from 'cheerio';
import { allowInsecureTls } from './network-config';

export class JobDetailScraper {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Extrai o texto da descrição da página individual da vaga no LinkedIn.
   */
  async extrairDescricao(link: string): Promise<string> {
    if (!this.browser) {
      throw new Error('Navegador não inicializado. Chame init() primeiro.');
    }

    if (!link) {
      throw new Error('Link da vaga vazio.');
    }

    const context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      ignoreHTTPSErrors: allowInsecureTls,
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    const page = await context.newPage();

    try {
      await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.delay(2500);

      // Expande "mostrar mais" se existir
      const showMore = page.locator(
        'button.show-more-less-html__button, button[aria-label*="mais"], button[aria-label*="more"]'
      );
      if ((await showMore.count()) > 0) {
        await showMore.first().click({ timeout: 3000 }).catch(() => undefined);
        await this.delay(800);
      }

      const html = await page.content();
      const descricao = this.parseDescricao(html);

      if (!descricao || descricao.length < 80) {
        throw new Error(
          'Descrição não encontrada ou muito curta. A vaga pode redirecionar para ATS externo.'
        );
      }

      return descricao;
    } finally {
      await context.close();
    }
  }

  private parseDescricao(html: string): string {
    const $ = cheerio.load(html);

    const selectors = [
      '.show-more-less-html__markup',
      '.description__text',
      '.jobs-description__content',
      '.jobs-box__html-content',
      '#job-details',
      '[data-test-id="job-details-description"]',
      'article.jobs-description',
    ];

    for (const selector of selectors) {
      const el = $(selector).first();
      if (el.length) {
        const text = el.text().replace(/\s+/g, ' ').trim();
        if (text.length >= 80) {
          return text;
        }
      }
    }

    // Fallback: maior bloco de texto em sections comuns
    let best = '';
    $('section, article, div').each((_, element) => {
      const text = $(element).text().replace(/\s+/g, ' ').trim();
      if (text.length > best.length && text.length < 20000) {
        const lower = text.toLowerCase();
        if (
          lower.includes('responsab') ||
          lower.includes('requisito') ||
          lower.includes('requirement') ||
          lower.includes('qualifica') ||
          lower.includes('about the job') ||
          lower.includes('sobre a vaga')
        ) {
          best = text;
        }
      }
    });

    return best;
  }

  async fechar(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
