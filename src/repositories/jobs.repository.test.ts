import fs from 'fs';
import os from 'os';
import path from 'path';
import { JobsRepository } from '../repositories/jobs.repository';
import { Vaga } from '../types/vaga';

describe('JobsRepository', () => {
  let dbPath: string;
  let repository: JobsRepository;

  const vagaBase: Vaga = {
    id: '123456789',
    titulo: 'Desenvolvedor Full Stack',
    empresa: 'Empresa Teste',
    localizacao: 'Bauru, SP',
    modelo: 'Remoto',
    link: 'https://www.linkedin.com/jobs/view/123456789',
    tipoBusca: 'remoto',
  };

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `jobs-test-${Date.now()}-${Math.random()}.db`);
    repository = new JobsRepository(dbPath);
    await repository.init();
  });

  afterEach(async () => {
    await repository.fechar();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('inicializa o schema e salva a vaga completa', async () => {
    await repository.salvarVaga(vagaBase);

    const salva = await repository.buscarPorId(vagaBase.id);
    expect(salva).toBeDefined();
    expect(salva?.titulo).toBe(vagaBase.titulo);
    expect(salva?.empresa).toBe(vagaBase.empresa);
    expect(salva?.link).toBe(vagaBase.link);
    expect(salva?.status).toBe('nova');
    expect(salva?.data_envio).toBeTruthy();
  });

  it('lista vagas filtrando por status', async () => {
    await repository.salvarVaga(vagaBase);
    await repository.salvarVaga({
      ...vagaBase,
      id: '987654321',
      titulo: 'Analista de Sistemas',
    });
    await repository.atualizarStatus('987654321', 'aplicado');

    const novas = await repository.listarVagas('nova');
    const aplicadas = await repository.listarVagas('aplicado');

    expect(novas).toHaveLength(1);
    expect(novas[0].id_vaga).toBe('123456789');
    expect(aplicadas).toHaveLength(1);
    expect(aplicadas[0].id_vaga).toBe('987654321');
  });

  it('marca vaga como aplicado e preenche data_aplicacao', async () => {
    await repository.salvarVaga(vagaBase);

    const atualizada = await repository.atualizarStatus(vagaBase.id, 'aplicado');

    expect(atualizada?.status).toBe('aplicado');
    expect(atualizada?.data_aplicacao).toBeTruthy();
  });

  it('descarta vaga sem apagar o histórico', async () => {
    await repository.salvarVaga(vagaBase);

    const descartada = await repository.atualizarStatus(vagaBase.id, 'descartado');
    const aindaExiste = await repository.vagaExiste(vagaBase.id);
    const todas = await repository.listarVagas();

    expect(descartada?.status).toBe('descartado');
    expect(descartada?.data_aplicacao).toBeNull();
    expect(aindaExiste).toBe(true);
    expect(todas).toHaveLength(1);
  });

  it('salva descrição e plano de estudos da vaga', async () => {
    await repository.salvarVaga(vagaBase);

    const comDescricao = await repository.salvarDescricao(
      vagaBase.id,
      'Requisitos: TypeScript, Node.js e testes automatizados.',
      'manual'
    );

    expect(comDescricao?.descricao).toContain('TypeScript');
    expect(comDescricao?.descricao_fonte).toBe('manual');
    expect(comDescricao?.descricao_atualizada_em).toBeTruthy();

    const planoGerando = await repository.upsertPlano(vagaBase.id, {
      status: 'gerando',
      conteudo_md: '',
    });
    expect(planoGerando.status).toBe('gerando');

    const planoPronto = await repository.upsertPlano(vagaBase.id, {
      status: 'pronto',
      conteudo_md: '# Plano\n\n- Estudar TypeScript',
      modelo_llm: 'gpt-4o-mini',
      erro: null,
    });

    expect(planoPronto.status).toBe('pronto');
    expect(planoPronto.conteudo_md).toContain('TypeScript');
    expect(planoPronto.modelo_llm).toBe('gpt-4o-mini');

    const buscado = await repository.buscarPlanoPorVaga(vagaBase.id);
    expect(buscado?.id).toBe(planoPronto.id);
  });

  it('salva e atualiza o currículo do candidato', async () => {
    const salvo = await repository.salvarCurriculo({
      nome_arquivo: 'cv.pdf',
      mime_type: 'application/pdf',
      texto_extraido: 'Experiência com TypeScript, Node.js e React.',
    });

    expect(salvo.nome_arquivo).toBe('cv.pdf');
    expect(salvo.texto_extraido).toContain('TypeScript');

    const atualizado = await repository.salvarCurriculo({
      nome_arquivo: 'cv-novo.txt',
      mime_type: 'text/plain',
      texto_extraido: 'Experiência com .NET e C#.',
    });

    expect(atualizado.nome_arquivo).toBe('cv-novo.txt');
    expect((await repository.buscarCurriculo())?.texto_extraido).toContain('.NET');

    await repository.removerCurriculo();
    expect(await repository.buscarCurriculo()).toBeUndefined();
  });
});
