import { Router } from 'express';
import { getBooks } from '../controllers/book.controller';

const router = Router();

router.get('/books', getBooks);

export default router;
