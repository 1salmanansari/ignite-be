import express from 'express';
import cors from 'cors';
import bookRoutes from './routes/book.routes';

const app = express();
const PORT = process.env.PORT || 4000; // Ignite-FE uses port 8000 (Gutendex) or 3000 (Next.js). Let's use 4000 for Ignite-BE.

app.use(cors());
app.use(express.json());

app.use('/', bookRoutes);

app.get('/', (req, res) => {
    res.send('Ignite Backend API');
});

// Start server if this file is run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
