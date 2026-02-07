import { Request, Response } from 'express';
import prisma from '../prisma';

export const getBooks = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = 25; // Default matching Gutendex
        const topic = req.query.topic as string;
        const search = req.query.search as string;

        const where: any = {};

        if (topic) {
            where.OR = [
                { subjects: { contains: topic } }, // Simple string contains for JSON string
                { bookshelves: { contains: topic } }
            ];
        }

        if (req.query.languages) {
            const languages = (req.query.languages as string).split(',');
            const languageFilters = languages.map(lang => ({
                languages: { contains: lang }
            }));

            if (where.OR) {
                where.AND = [
                    { OR: where.OR },
                    { OR: languageFilters }
                ];
                delete where.OR;
            } else {
                where.OR = languageFilters;
            }
        }

        if (search) {
            const searchTerms = [
                { title: { contains: search } },
                { authors: { some: { name: { contains: search } } } }
            ];
            if (where.AND) {
                where.AND.push({ OR: searchTerms });
            } else if (where.OR) {
                where.AND = [
                    { OR: where.OR },
                    { OR: searchTerms }
                ];
                delete where.OR;
            } else {
                where.OR = searchTerms;
            }
        }

        const totalCount = await prisma.book.count({ where });
        const books = await prisma.book.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
                authors: true,
                translators: true
            },
            orderBy: { download_count: 'desc' }
        });

        // Format response to match Gutendex
        const results = books.map((book: any) => ({
            ...book,
            subjects: JSON.parse(book.subjects),
            bookshelves: JSON.parse(book.bookshelves),
            languages: JSON.parse(book.languages),
            formats: JSON.parse(book.formats)
        }));

        const languagesParam = req.query.languages ? `&languages=${req.query.languages}` : '';
        const next = (page * pageSize < totalCount) ? `/books?page=${page + 1}${topic ? `&topic=${topic}` : ''}${search ? `&search=${search}` : ''}${languagesParam}` : null;
        const previous = (page > 1) ? `/books?page=${page - 1}${topic ? `&topic=${topic}` : ''}${search ? `&search=${search}` : ''}${languagesParam}` : null;

        res.json({
            count: totalCount,
            next,
            previous,
            results
        });
    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
