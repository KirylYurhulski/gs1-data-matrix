const express = require('express');
const bwipjs = require('bwip-js');
const PDFDocument = require('pdfkit');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// =========================
// 👉 генерация DataMatrix
// =========================
function generateMatrix(text, version) {
    return bwipjs.toBuffer({
        bcid: 'datamatrix',
        text: text,
        scale: 3,
        //version: `${version}x${version}`, // размер матрицы
    });
}

// =========================
// 👉 POST /pdf
// =========================
app.post('/pdf', async (req, res) => {
    try {
        const { codes, size } = req.body;

        if (!Array.isArray(codes)) {
            return res.status(400).json({ error: 'codes must be an array' });
        }

        // допустимые размеры DataMatrix
        const allowedSizes = [10, 12, 14, 16, 18, 20];
        const sizeMap = { 11: 10, 14: 14 }; // если приходит 11 → 10
        const version = allowedSizes.includes(size)
            ? size
            : (sizeMap[size] || 14);

        const doc = new PDFDocument({
            size: 'A4',
            margin: 20
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="datamatrix.pdf"');

        doc.pipe(res);

        // =========================
        // 👉 СЕТКА
        // =========================
        const cols = 5;
        const codeSize = 90;
        const padding = 15;

        const pageWidth = doc.page.width;
        const totalWidth = cols * codeSize + (cols - 1) * padding;
        const startX = (pageWidth - totalWidth) / 2;

        let x = startX;
        let y = 20;
        let colIndex = 0;

        // =========================
        // 👉 ГЕНЕРАЦИЯ
        // =========================
        for (let raw of codes) {
            try {
                const buffer = await generateMatrix(raw, version);

                doc.image(buffer, x, y, { width: codeSize });

                colIndex++;

                if (colIndex === cols) {
                    colIndex = 0;
                    x = startX;
                    y += codeSize + 20;
                } else {
                    x += codeSize + padding;
                }

                if (y > doc.page.height - codeSize - 40) {
                    doc.addPage();
                    x = startX;
                    y = 20;
                }

            } catch (err) {
                console.error('Code generation error:', raw, err);
            }
        }

        doc.end();

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'internal error' });
    }
});

// =========================
// 👉 запуск
// =========================
app.listen(3000, () => console.log('Server running on http://localhost:3000'));