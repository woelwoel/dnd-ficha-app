import { useNavigate } from 'react-router-dom'

/**
 * Página /privacidade — aviso LGPD (art. 9°).
 * Acessível sem login (chamada antes do Gate).
 */
export function PrivacyPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-6 py-10">
      <article className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl text-amber-600 font-display">
            Privacidade
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-gray-400 hover:text-amber-600"
          >
            ← Voltar
          </button>
        </header>

        <p className="text-sm text-gray-400">
          Última atualização: 2026-05-28.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg text-amber-600">Quais dados coletamos</h2>
          <ul className="list-disc ml-5 text-sm text-gray-200 space-y-1">
            <li>Email (autenticação e contato).</li>
            <li>Display name e avatar opcionais (mostrados pra parceiros de mesa).</li>
            <li>Fichas de personagem, anotações e configurações que você cria.</li>
            <li>Mesas das quais você participa (nome, código de convite, papel).</li>
            <li>Metadados técnicos: horários de criação/atualização das fichas.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg text-amber-600">Onde guardamos</h2>
          <p className="text-sm text-gray-200">
            Tudo fica em um banco PostgreSQL gerenciado pelo Supabase, e o app
            é servido pela Vercel. A região atual da instância do banco está
            documentada em <code className="text-amber-600">docs/ops/supabase-checklist.md</code>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg text-amber-600">Quem vê o quê</h2>
          <ul className="list-disc ml-5 text-sm text-gray-200 space-y-1">
            <li>Suas fichas pessoais: só você.</li>
            <li>Fichas em uma mesa: você e o(a) Mestre(a) daquela mesa.</li>
            <li>Seu display name e avatar: pessoas que dividem mesa com você.</li>
            <li>Seu email: ninguém (só o sistema usa para login).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg text-amber-600">Como apagar</h2>
          <p className="text-sm text-gray-200">
            Em qualquer tela logada, abra o menu de conta (canto superior
            direito) → <strong>Apagar minha conta</strong>. A operação remove
            todas as suas fichas, te tira das mesas em que é jogador, apaga as
            mesas em que é Mestre(a) (e por consequência os personagens dos
            jogadores nessas mesas), e remove o login. É irreversível.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg text-amber-600">Cookies e rastreio</h2>
          <p className="text-sm text-gray-200">
            Só usamos armazenamento local (localStorage / sessionStorage) pra
            manter sua sessão e rascunhos de criação de personagem. Não temos
            analytics, pixel ou rastreio de terceiros.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg text-amber-600">Contato</h2>
          <p className="text-sm text-gray-200">
            Para dúvidas, pedidos de acesso, correção ou portabilidade dos seus
            dados nos termos da LGPD (Lei 13.709/2018):{' '}
            <a
              href="mailto:gvfaria.gv@gmail.com"
              className="text-amber-600 underline"
            >
              gvfaria.gv@gmail.com
            </a>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg text-amber-600">Conteúdo e licença</h2>
          <p className="text-sm text-gray-200">
            Parte do conteúdo de jogo deriva do System Reference Document 5.1
            (“SRD 5.1”) da Wizards of the Coast LLC, licenciado sob a{' '}
            <a
              href="https://creativecommons.org/licenses/by/4.0/legalcode"
              className="text-amber-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Creative Commons Attribution 4.0 International License
            </a>. Descrições próprias e resumos são obra deste projeto. Este é
            um projeto de fã, sem afiliação ou endosso da Wizards of the Coast.
          </p>
        </section>
      </article>
    </div>
  )
}
