# KubrickHQ

KubrickHQ é um leitor de quadrinhos digital moderno, profissional e de código aberto, projetado para oferecer a melhor experiência de leitura no desktop. Com uma interface elegante e focada no conteúdo, ele suporta diversos formatos e oferece ferramentas avançadas de organização e aprimoramento de imagem.

## Recursos Principais

### Biblioteca Inteligente
*   **Scanner Rápido**: Adicione pastas inteiras ou arquivos individuais (Drag & Drop) instantaneamente.
*   **Coleções**: Organize suas HQs em coleções personalizadas para facilitar o acesso.
*   **Filtros e Busca**: Encontre rapidamente o que deseja por nome, ou ordene por recentes/alfabética.
*   **Progresso de Leitura**: Visualize facilmente onde você parou com barras de progresso nas capas.
*   **Gestão**: Renomeie, exclua ou mova HQs e coleções diretamente pela interface.

### 👓 Experiência de Leitura Premium
*   **Modos de Visualização**:
    *   **Página Única**: Foco total em uma página.
    *   **Página Dupla**: Simula a experiência de abrir uma revista física (ideal para splash pages).
    *   **Scroll Vertical**: Leitura contínua estilo webtoon.
*   **Navegação Intuitiva**: Controle por teclado (setas), mouse ou interface.
*   **Zoom e Pan**: Zoom suave e navegação arrastando a imagem.
*   **Lupa Interativa**: Ferramenta de lupa para inspecionar detalhes da arte sem perder o contexto da página.
*   **Barra Lateral**: Navegação rápida por miniaturas de todas as páginas.

### Tratamento de Imagem em Tempo Real
Melhore a qualidade de scans antigos ou ajuste para sua preferência:
*   **Filtro de Luz Azul**: Proteja seus olhos durante leituras noturnas.
*   **Brilho, Contraste e Saturação**: Ajuste as cores para dar vida às páginas.
*   **Nitidez (Sharpen)**: Melhore a definição de traços.
*   **Redução de Ruído (Denoise)**: Suavize granulação em arquivos de baixa qualidade.

### Personalização
*   **Temas**: Modo Claro, Escuro (padrão) ou seguindo o sistema.
*   **Idioma**: Interface disponível em Português (Brasil) e Inglês.
*   **Preferências**: Defina seu modo de leitura padrão e muito mais.

---

## Instalação

### Windows (Instalador)
1.  Baixe a última versão do instalador (`KubrickHQ Setup.exe`).
2.  Execute o arquivo e siga as instruções do assistente.
3.  O aplicativo criará atalhos na Área de Trabalho e no Menu Iniciar.

### Windows (Portátil)
1.  Baixe a versão portátil.
2.  Extraia e execute `KubrickHQ.exe`.

> **Nota:** Se tiver problemas com tela preta ao iniciar, verifique se seu antivírus (Windows Defender) não está bloqueando a comunicação do aplicativo localmente.

---

## Desenvolvimento

Se você deseja contribuir ou modificar o projeto:

### Pré-requisitos
*   Node.js (v16+)
*   Python (v3.9+)

### Configuração

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/KubrickHQ/KubrickHQ.git
    cd comic-reader
    ```

2.  **Configure o Backend (Python):**
    ```bash
    cd backend
    python -m venv venv
    .\venv\Scripts\activate
    pip install -r requirements.txt
    ```

3.  **Configure o Frontend (Node.js):**
    ```bash
    cd frontend # ou raiz, dependendo da estrutura
    npm install
    ```

4.  **Execute em modo de desenvolvimento:**
    ```bash
    npm start
    ```

5.  **Gere o executável:**
    ```bash
    npm run dist
    ```

---

## Tecnologias Utilizadas

*   **Frontend**: [React](https://react.dev/), [Vite](https://vitejs.dev/), [TailwindCSS](https://tailwindcss.com/)
*   **Backend**: [Python](https://www.python.org/), [Flask](https://flask.palletsprojects.com/), [PyMuPDF](https://pymupdf.readthedocs.io/)
*   **Desktop**: [Electron](https://www.electronjs.org/), [Electron Builder](https://www.electron.build/)

---

## Licença

Este projeto é desenvolvido por **@alankubrick13** e está disponível sob a licença GNU General Public License v3.0. Feito com ❤️ na Amazônia.
