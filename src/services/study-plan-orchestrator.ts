import { JobDetailScraper } from '../scraper-detail';
import { StudyPlanService } from './study-plan.service';
import type { DatabaseService } from '../database';
import type { PlanoEstudoRecord, VagaRecord } from '../types/vaga';

interface GeneratePlanOptions {
  /** Se informado, usa como descrição e marca fonte=manual (não faz scrape). */
  descricaoManual?: string;
  /** Força novo scrape mesmo se já existir descrição. */
  forcarScrape?: boolean;
}

export class StudyPlanOrchestrator {
  private readonly studyPlanService = new StudyPlanService();

  constructor(private readonly db: DatabaseService) {}

  async gerarParaVaga(
    idVaga: string,
    options: GeneratePlanOptions = {}
  ): Promise<{ vaga: VagaRecord; plano: PlanoEstudoRecord }> {
    const vaga = await this.db.buscarPorId(idVaga);
    if (!vaga) {
      throw new Error('Vaga não encontrada.');
    }

    await this.db.upsertPlano(idVaga, {
      status: 'gerando',
      conteudo_md: '',
      erro: null,
    });

    try {
      let descricao = options.descricaoManual?.trim() || '';

      if (descricao) {
        await this.db.salvarDescricao(idVaga, descricao, 'manual');
      } else if (!vaga.descricao || options.forcarScrape) {
        if (!vaga.link) {
          throw new Error('Vaga sem link para scraping. Cole a descrição manualmente.');
        }

        const scraper = new JobDetailScraper();
        try {
          await scraper.init();
          descricao = await scraper.extrairDescricao(vaga.link);
          await this.db.salvarDescricao(idVaga, descricao, 'scrape');
        } finally {
          await scraper.fechar();
        }
      } else {
        descricao = vaga.descricao;
      }

      if (!descricao || descricao.length < 40) {
        throw new Error('Descrição insuficiente. Cole o texto da vaga manualmente.');
      }

      const vagaAtualizada = (await this.db.buscarPorId(idVaga))!;
      const curriculo = await this.db.buscarCurriculo();
      const { markdown, modelo } = await this.studyPlanService.gerarPlano(
        vagaAtualizada,
        descricao,
        curriculo?.texto_extraido
      );

      const plano = await this.db.upsertPlano(idVaga, {
        status: 'pronto',
        conteudo_md: markdown,
        modelo_llm: modelo,
        erro: null,
      });

      return { vaga: vagaAtualizada, plano };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao gerar plano.';
      const plano = await this.db.upsertPlano(idVaga, {
        status: 'erro',
        erro: message,
        conteudo_md: '',
      });

      const vagaAtual = (await this.db.buscarPorId(idVaga))!;
      throw Object.assign(new Error(message), { plano, vaga: vagaAtual });
    }
  }
}
