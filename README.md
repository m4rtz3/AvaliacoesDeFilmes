# 🎬 Sistema de Avaliação de Filmes

Sistema web para cadastro e avaliação de filmes utilizando **Node.js**, **Express** e **Apache Cassandra**.

## 📋 Pré-requisitos

- [Play with Docker](https://labs.play-with-docker.com/) (2 instâncias)
- Navegador web

## 🚀 Instalação

### 📦 Instância 1: Banco de Dados (Cassandra)

1. **Criar e executar o container Cassandra:**

```bash
docker pull tobert/cassandra
docker run -d --name cassandra \
  -p 9042:9042 \
  tobert/cassandra
```

2. **Aguardar inicialização (importante!):**

```bash
sleep 20
```

3. **Criar o banco de dados e tabelas:**

```bash
docker exec -it cassandra cqlsh
```

Dentro do `cqlsh`, execute:

```sql
CREATE KEYSPACE IF NOT EXISTS filmesdb
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE filmesdb;

CREATE TABLE filmes (
    id uuid PRIMARY KEY,
    nome text
);

CREATE TABLE avaliacoes (
    id uuid,
    id_filme uuid,
    nota int,
    usuario text,
    data timestamp,
    PRIMARY KEY (id_filme, id)
);

exit
```

4. **Obter o IP da instância Cassandra:**

```bash
hostname -i
```

> ⚠️ **IMPORTANTE:** Anote este IP! Você vai precisar dele na próxima etapa.

---

### 🟢 Instância 2: Servidor Node.js

1. **Criar estrutura do projeto:**

```bash
mkdir app
cd app
mkdir public
```

2. **Criar o `package.json`:**

```bash
cat <<EOF > package.json
{
  "name": "filmes-app",
  "version": "1.0.0",
  "main": "server.js",
  "type": "commonjs",
  "dependencies": {
    "express": "^4.18.2",
    "body-parser": "^1.20.2",
    "uuid": "^9.0.0",
    "cassandra-driver": "^4.6.4"
  }
}
EOF
```

3. **Criar o arquivo `server.js`:**

```bash
vi server.js
```

Pressione `i` para entrar no modo de inserção e cole o seguinte código:

> ⚠️ **Substitua `IP_DA_INSTANCIA_CASSANDRA`** pelo IP que você anotou na etapa anterior!

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const cassandra = require('cassandra-driver');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

// Conexão Cassandra
const client = new cassandra.Client({
    contactPoints: ['IP_DA_INSTANCIA_CASSANDRA'],  // ⚠️ SUBSTITUA AQUI
    localDataCenter: 'datacenter1',
    keyspace: 'filmesdb'
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/public')));

// ---------------------- ENDPOINTS -------------------------

// 1. Carregar lista de filmes
app.get('/filmes', async (req, res) => {
    try {
        const result = await client.execute("SELECT * FROM filmes");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// 2. Cadastrar novo filme
app.post('/filmes', async (req, res) => {
    const { nome } = req.body;
    const id = uuidv4();

    try {
        await client.execute(
            "INSERT INTO filmes (id, nome) VALUES (?, ?)",
            [id, nome],
            { prepare: true }
        );
        res.json({ id, nome });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// 3. Listar avaliações de um filme
app.get('/avaliacoes/:id_filme', async (req, res) => {
    const id_filme = req.params.id_filme;

    try {
        const result = await client.execute(
            "SELECT * FROM avaliacoes WHERE id_filme = ?",
            [id_filme],
            { prepare: true }
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// 4. Enviar avaliação
app.post('/avaliacoes', async (req, res) => {
    const { id_filme, usuario, nota } = req.body;

    try {
        const id = uuidv4();
        const dataAtual = new Date();  // Gerar data no Node.js
        
        await client.execute(
            "INSERT INTO avaliacoes (id_filme, id, usuario, nota, data) VALUES (?, ?, ?, ?, ?)",
            [id_filme, id, usuario, nota, dataAtual],
            { prepare: true }
        );

        res.json({ sucesso: true });
    } catch (err) {
        console.error('Erro ao inserir avaliação:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ----------------------------------------------------------

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
```

Pressione `ESC` e digite `:wq` para salvar e sair.

4. **Criar o arquivo `public/index.html`:**

```bash
vi public/index.html
```

Pressione `i` e cole:

```html
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>🎬 Avaliação de Filmes</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>

<body class="bg-light">
    <div class="container py-5">
        <h1 class="mb-4 text-center">Avaliação de Filmes</h1>

        <!-- Formulário para adicionar filme -->
        <div class="card mb-4">
            <div class="card-body">
                <h5 class="card-title">Adicionar novo filme</h5>
                <div class="input-group">
                    <input type="text" id="novoFilme" class="form-control" placeholder="Nome do filme">
                    <button class="btn btn-primary" onclick="adicionarFilme()">Adicionar</button>
                </div>
            </div>
        </div>

        <!-- Lista de filmes -->
        <div id="listaFilmes" class="row g-3"></div>
    </div>

    <!-- Modal de avaliações -->
    <div class="modal fade" id="avaliacoesModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 id="modalTitulo" class="modal-title">Avaliações</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div id="mediaAvaliacao" class="alert alert-info mb-3" style="display:none;">
                        <strong>Média das avaliações:</strong> <span id="mediaValor">0</span>/10
                    </div>
                    
                    <ul id="listaAvaliacoes" class="list-group mb-3"></ul>

                    <h6>Nova avaliação</h6>
                    <input type="text" id="usuario" class="form-control mb-2" placeholder="Seu nome">
                    <input type="number" id="nota" class="form-control mb-2" placeholder="Nota (0 a 10)" min="0" max="10">
                    <button class="btn btn-success w-100" onclick="enviarAvaliacao()">Enviar</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let filmes = [];
        let filmeAtual = null;
        let modalInstance = null;

        // ----- Função para carregar filmes -----
        async function carregarFilmes() {
            try {
                const resp = await fetch('/filmes');
                filmes = await resp.json();
                renderizarFilmes();
            } catch (err) {
                alert('Erro ao carregar filmes: ' + err.message);
            }
        }

        // ----- Renderizar lista de filmes -----
        function renderizarFilmes() {
            const container = document.getElementById('listaFilmes');
            
            if (filmes.length === 0) {
                container.innerHTML = '<div class="col-12"><p class="text-center text-muted">Nenhum filme cadastrado ainda.</p></div>';
                return;
            }

            container.innerHTML = filmes.map(filme => `
                <div class="col-md-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">${filme.nome}</h5>
                            <p class="text-muted small">ID: ${filme.id}</p>
                            <button class="btn btn-info btn-sm w-100" onclick="verAvaliacoes('${filme.id}', '${filme.nome}')">
                                Ver Avaliações
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // ----- Função para adicionar filme -----
        async function adicionarFilme() {
            const nome = document.getElementById("novoFilme").value.trim();
            
            if (!nome) {
                alert("Digite o nome do filme!");
                return;
            }

            try {
                const resp = await fetch('/filmes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome })
                });

                if (resp.ok) {
                    document.getElementById("novoFilme").value = '';
                    await carregarFilmes();
                    alert('Filme adicionado com sucesso!');
                } else {
                    const erro = await resp.json();
                    alert('Erro ao adicionar filme: ' + erro.erro);
                }
            } catch (err) {
                alert('Erro ao adicionar filme: ' + err.message);
            }
        }

        // ----- Função para ver avaliações -----
        async function verAvaliacoes(id, nome) {
            filmeAtual = id;
            document.getElementById('modalTitulo').textContent = `Avaliações: ${nome}`;
            
            try {
                const resp = await fetch(`/avaliacoes/${id}`);
                const avaliacoes = await resp.json();
                
                renderizarAvaliacoes(avaliacoes);
                
                // Abrir modal
                if (!modalInstance) {
                    modalInstance = new bootstrap.Modal(document.getElementById('avaliacoesModal'));
                }
                modalInstance.show();
            } catch (err) {
                alert('Erro ao carregar avaliações: ' + err.message);
            }
        }

        // ----- Renderizar avaliações -----
        function renderizarAvaliacoes(avaliacoes) {
            const lista = document.getElementById('listaAvaliacoes');
            const divMedia = document.getElementById('mediaAvaliacao');
            const spanMedia = document.getElementById('mediaValor');
            
            if (avaliacoes.length === 0) {
                lista.innerHTML = '<li class="list-group-item text-muted">Nenhuma avaliação ainda. Seja o primeiro!</li>';
                divMedia.style.display = 'none';
                return;
            }

            // Calcular média
            const soma = avaliacoes.reduce((acc, av) => acc + av.nota, 0);
            const media = (soma / avaliacoes.length).toFixed(1);
            spanMedia.textContent = media;
            divMedia.style.display = 'block';

            // Renderizar lista
            lista.innerHTML = avaliacoes.map(av => {
                const data = new Date(av.data);
                const dataFormatada = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR');
                
                return `
                    <li class="list-group-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${av.usuario}</strong>
                                <br>
                                <small class="text-muted">${dataFormatada}</small>
                            </div>
                            <span class="badge bg-primary rounded-pill">${av.nota}/10</span>
                        </div>
                    </li>
                `;
            }).join('');
        }

        // ----- Função para enviar avaliação -----
        // ----- Função para enviar avaliação -----
async function enviarAvaliacao() {
    const usuario = document.getElementById("usuario").value.trim();
    const notaInput = document.getElementById("nota").value;

    if (!usuario) {
        alert("Digite seu nome!");
        return;
    }

    if (!notaInput || notaInput === '') {
        alert("Digite uma nota!");
        return;
    }

    const nota = parseInt(notaInput);

    if (isNaN(nota) || nota < 0 || nota > 10) {
        alert("Digite uma nota válida entre 0 e 10!");
        return;
    }

    if (!filmeAtual) {
        alert("Erro: Nenhum filme selecionado!");
        return;
    }

    // Log para debug
    console.log('Enviando avaliação:', { 
        id_filme: filmeAtual, 
        usuario, 
        nota,
        tipo_id: typeof filmeAtual,
        tipo_nota: typeof nota
    });

    try {
        const resp = await fetch('/avaliacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id_filme: filmeAtual, 
                usuario, 
                nota 
            })
        });

        const resultado = await resp.json();

        if (resp.ok) {
            document.getElementById("usuario").value = '';
            document.getElementById("nota").value = '';
            
            const nomeFilme = filmes.find(f => f.id === filmeAtual)?.nome || 'Filme';
            await verAvaliacoes(filmeAtual, nomeFilme);
            
            alert('Avaliação enviada com sucesso!');
        } else {
            console.error('Erro do servidor:', resultado);
            alert('Erro ao enviar avaliação: ' + resultado.erro);
        }
    } catch (err) {
        console.error('Erro de rede:', err);
        alert('Erro ao enviar avaliação: ' + err.message);
    }
}    
    
        // ----- Inicializa a página -----
        carregarFilmes();
    </script>
</body>

</html>
```

Pressione `ESC` e digite `:wq` para salvar.

5. **Executar o servidor:**

```bash
docker run -d --name nodeapp \
  -p 3000:3000 \
  -v "$PWD":/usr/src/app \
  -w /usr/src/app \
  node:18 \
  sh -c "npm install && node server.js"
```

6. **Verificar se está rodando:**

```bash
docker logs -f nodeapp
```

Você deve ver: `Servidor rodando em http://localhost:3000`

---

## 🎯 Acessando a aplicação

No **Play with Docker**, clique no link da porta **3000** que aparece na **Instância 2**.

---

## 📁 Estrutura do Projeto

```
app/
├── package.json
├── server.js
└── public/
    └── index.html
```

---

## 🧪 Testando as Funcionalidades

### ✅ Adicionar Filmes
1. Digite o nome do filme no campo "Nome do filme"
2. Clique em "Adicionar"

### ✅ Ver Avaliações
1. Clique no botão "Ver Avaliações" em qualquer filme
2. Um modal abrirá mostrando todas as avaliações

### ✅ Adicionar Avaliação
1. No modal de avaliações, preencha:
   - Seu nome
   - Nota de 0 a 10
2. Clique em "Enviar"

### ✅ Ver Média
- A média das avaliações é calculada automaticamente

---

## 🔧 Comandos Úteis

### Reiniciar o servidor Node:
```bash
docker restart nodeapp
```

### Ver logs do servidor:
```bash
docker logs -f nodeapp
```

### Parar tudo:
```bash
docker stop nodeapp cassandra
```

### Remover containers:
```bash
docker rm nodeapp cassandra
```
---

## 📝 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/filmes` | Lista todos os filmes |
| POST | `/filmes` | Cadastra novo filme |
| GET | `/avaliacoes/:id_filme` | Lista avaliações de um filme |
| POST | `/avaliacoes` | Envia nova avaliação |
