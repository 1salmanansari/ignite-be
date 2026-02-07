import axios from 'axios';
import prisma from '../prisma';

const GUTENDEX_API_URL = 'https://gutendex.com/books';

async function fetchBooks(page: number = 1) {
    try {
        const response = await axios.get(`${GUTENDEX_API_URL}?page=${page}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        return null;
    }
}

async function seed() {
    console.log('Starting seeding...');

    // Fetch first 5 pages to get a good amount of data
    for (let page = 1; page <= 5; page++) {
        console.log(`Fetching page ${page}...`);
        const data = await fetchBooks(page);

        if (!data || !data.results) continue;

        for (const bookData of data.results) {
            console.log(`Processing book: ${bookData.title}`);

            // Upsert Authors
            const authors = [];
            for (const authorData of bookData.authors || []) {
                const author = await prisma.person.upsert({
                    where: { id: authorData.birth_year ? undefined : -1 }, // Simple hack, ideally match by name + dates. 
                    // Actually, Prisma upsert needs a unique field. We don't have one on Person name/birth_year easily without composite unique constraint.
                    // Let's just create or find manually.
                    create: {
                        name: authorData.name,
                        birth_year: authorData.birth_year,
                        death_year: authorData.death_year,
                    },
                    update: {},
                }).catch(async () => {
                    // Fallback: find first
                    return await prisma.person.findFirst({
                        where: { name: authorData.name, birth_year: authorData.birth_year }
                    }) || await prisma.person.create({
                        data: {
                            name: authorData.name,
                            birth_year: authorData.birth_year,
                            death_year: authorData.death_year,
                        }
                    });
                });
                authors.push(author);
            }

            // Upsert Translators
            const translators = [];
            for (const translatorData of bookData.translators || []) {
                const translator = await prisma.person.findFirst({
                    where: { name: translatorData.name, birth_year: translatorData.birth_year }
                }) || await prisma.person.create({
                    data: {
                        name: translatorData.name,
                        birth_year: translatorData.birth_year,
                        death_year: translatorData.death_year,
                    }
                });
                translators.push(translator);
            }

            // Upsert Book
            await prisma.book.upsert({
                where: { id: bookData.id },
                update: {
                    title: bookData.title,
                    subjects: JSON.stringify(bookData.subjects),
                    bookshelves: JSON.stringify(bookData.bookshelves),
                    languages: JSON.stringify(bookData.languages),
                    copyright: bookData.copyright,
                    media_type: bookData.media_type,
                    formats: JSON.stringify(bookData.formats),
                    download_count: bookData.download_count,
                    authors: {
                        set: [], // Clear existing relations
                        connect: authors.map(a => ({ id: a.id }))
                    },
                    translators: {
                        set: [],
                        connect: translators.map(t => ({ id: t.id }))
                    }
                },
                create: {
                    id: bookData.id,
                    title: bookData.title,
                    subjects: JSON.stringify(bookData.subjects),
                    bookshelves: JSON.stringify(bookData.bookshelves),
                    languages: JSON.stringify(bookData.languages),
                    copyright: bookData.copyright,
                    media_type: bookData.media_type,
                    formats: JSON.stringify(bookData.formats),
                    download_count: bookData.download_count,
                    authors: {
                        connect: authors.map(a => ({ id: a.id }))
                    },
                    translators: {
                        connect: translators.map(t => ({ id: t.id }))
                    }
                }
            });
        }
    }

    console.log('Seeding completed.');
}

seed()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
