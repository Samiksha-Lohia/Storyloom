import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BookPageData } from '../../components/templates/BookPageData';
import { Skeleton } from '../../components/common/Skeleton';
import { Button } from '../../components/common/Button';

export function BookPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [book, setBook] = useState(null);
  const [relatedBooks, setRelatedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBookData() {
      try {
        setLoading(true);
        setError(null);

        const res = await api.books.getById(id);
        const bookData = res?.data || res;
        if (isMounted && bookData && (bookData._id || bookData.id || bookData.title)) {
          setBook(bookData);

          // Fetch related books by genre
          if (bookData.genre) {
            try {
              const relRes = await api.books.list({
                genre: bookData.genre,
                limit: 8,
              });
              const list = relRes?.data || (Array.isArray(relRes) ? relRes : []);
              if (isMounted && Array.isArray(list)) {
                // Filter out current book
                setRelatedBooks(list.filter((b) => (b._id || b.id) !== id));
              }
            } catch (relErr) {
              console.warn('Failed to load related books:', relErr);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Story could not be found.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (id) {
      loadBookData();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-8 pb-16 animate-pulse">
        <div className="bg-white rounded-3xl border border-stone-200 p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4 lg:col-span-3 flex justify-center">
            <Skeleton className="w-56 h-80 rounded-2xl" />
          </div>
          <div className="md:col-span-8 lg:col-span-9 space-y-4">
            <Skeleton className="w-24 h-6 rounded-full" />
            <Skeleton className="w-3/4 h-10 rounded-lg" />
            <Skeleton className="w-1/2 h-6 rounded-lg" />
            <Skeleton className="w-full h-20 rounded-xl" />
            <Skeleton className="w-40 h-12 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-bold text-stone-900 mb-2">
          Story Not Found
        </h1>
        <p className="text-stone-600 text-sm max-w-md mb-6">
          {error || 'The story you are looking for may have been removed, unpublished, or does not exist.'}
        </p>
        <Link to="/browse">
          <Button variant="primary" size="md">
            Return to Catalogue
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <BookPageData
      book={book}
      relatedBooks={relatedBooks}
      user={user}
    />
  );
}

export { BookPageData };
export default BookPage;
