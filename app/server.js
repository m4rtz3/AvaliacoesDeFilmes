const express = require('express');
const bodyParser = require('body-parser');
const cassandra = require('cassandra-driver');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

// Conexão Cassandra
const client = new cassandra.Client({
    contactPoints: ['192.168.0.29'],
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
