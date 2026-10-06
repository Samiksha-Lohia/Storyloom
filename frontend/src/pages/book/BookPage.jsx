import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BookPageData } from '../../components/templates/BookPageData';
import { Skeleton } from '../../components/common/Skeleton';
import { Button } from '../../components/common/Button';

export function BookPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();

  const [book, setBook] = useState(null);
  const [relatedBooks, setRelatedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(location.state?.message || null);

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
      <div className="space-y-6 pb-16 font-body">
        <div className="bg-paper rounded border border-rule p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 lg:col-span-3 flex justify-center">
            <Skeleton className="w-56 aspect-[2/3] rounded" />
          </div>
          <div className="md:col-span-8 lg:col-span-9 space-y-3">
            <Skeleton className="w-24 h-5 rounded" />
            <Skeleton className="w-3/4 h-8 rounded" />
            <Skeleton className="w-1/2 h-5 rounded" />
            <Skeleton className="w-full h-16 rounded" />
            <Skeleton className="w-36 h-10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4 font-body text-ink">
        <h1 className="font-calligraphy text-3xl font-normal text-ink mb-2">
          Story Not Found
        </h1>
        <p className="text-muted text-xs max-w-md mb-6">
          {error || 'The story you are looking for may have been removed, unpublished, or does not exist.'}
        </p>
        <Link to="/browse">
          <Button variant="primary">
            Return to Catalogue
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successBanner && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-3 bg-accent/10 border border-accent/40 rounded flex items-center justify-between text-xs text-ink">
            <span className="font-bold">{successBanner}</span>
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              className="text-muted hover:text-ink text-xs ml-4 cursor-pointer font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <BookPageData
        book={book}
        relatedBooks={relatedBooks}
        user={user}
      />
    </div>
  );
}

export { BookPageData };
export default BookPage;
