import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useServiceReviews, useCreateReview, useUpdateReview, type Service, type ServiceReview } from '@/hooks/use-services';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlag } from '@/hooks/use-app-settings';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const servicesEnabled = useFeatureFlag('features.services_enabled');
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [editingReview, setEditingReview] = useState<ServiceReview | null>(null);
  const [reviewsOffset, setReviewsOffset] = useState(0);
  const reviewsLimit = 20;

  // Если услуги выключены, редирект на главную
  useEffect(() => {
    if (servicesEnabled === false) {
      navigate('/teachers');
    }
  }, [servicesEnabled, navigate]);

  const { data: service, isLoading: serviceLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Service;
    },
    enabled: !!id,
  });

  const { data: reviews, isLoading: reviewsLoading } = useServiceReviews(id!, { limit: reviewsLimit, offset: reviewsOffset });
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();

  const userReview = reviews?.reviews.find(r => r.user_id === profile?.id);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      toast.error('Войдите, чтобы оставить отзыв');
      return;
    }

    if (rating === 0) {
      toast.error('Поставьте оценку');
      return;
    }

    try {
      if (editingReview) {
        await updateReview.mutateAsync({
          id: editingReview.id,
          service_id: id!,
          rating,
          comment: comment.trim() || undefined,
        });
        toast.success('Отзыв обновлен');
        setEditingReview(null);
      } else {
        await createReview.mutateAsync({
          service_id: id!,
          rating,
          comment: comment.trim() || undefined,
        });
        toast.success('Отзыв добавлен');
      }
      
      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Ошибка при отправке отзыва');
    }
  };

  const handleEditReview = (review: ServiceReview) => {
    setEditingReview(review);
    setRating(review.rating);
    setComment(review.comment || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingReview(null);
    setRating(0);
    setComment('');
  };

  if (serviceLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="px-5 pt-6">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground">Загрузка...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="px-5 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-primary text-sm font-medium mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Назад
          </button>
          <div className="text-center py-12">
            <p className="text-4xl mb-3">😕</p>
            <p className="text-lg font-semibold text-foreground mb-2">Услуга не найдена</p>
          </div>
        </div>
      </div>
    );
  }

  const displayRating = hoveredStar || rating || 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        className="px-5 pt-6"
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-primary text-sm font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>

        {/* Информация об услуге */}
        <div className="bg-card rounded-2xl p-5 border border-border/50 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <h1 className="text-xl font-bold mb-2 text-foreground">{service.title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-2xl font-bold text-foreground">{service.price}₽</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-base font-semibold text-primary">
                  {service.author_name.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{service.author_name}</p>
                {service.author_username && (
                  <a
                    href={`https://t.me/${service.author_username.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    {service.author_username}
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span className="text-base font-bold text-foreground">{service.author_rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground ml-1">💬 {service.reviews_count}</span>
            </div>
          </div>
        </div>

        {/* Форма отзыва - только для авторизованных */}
        {profile && !userReview && (
          <div className="bg-card rounded-2xl p-5 border border-border/50 mb-4">
            <h3 className="text-base font-bold mb-4 text-foreground">
              {editingReview ? 'Редактировать отзыв' : 'Оставить отзыв'}
            </h3>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2 text-foreground">Ваша оценка</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(null)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= displayRating
                            ? 'text-warning fill-warning'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Комментарий (необязательно)</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Расскажите о вашем опыте..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2">
                {editingReview && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Отмена
                  </Button>
                )}
                <Button type="submit" disabled={createReview.isPending || updateReview.isPending}>
                  {createReview.isPending || updateReview.isPending ? 'Отправка...' : editingReview ? 'Сохранить' : 'Отправить'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Редактирование своего отзыва */}
        {profile && userReview && !editingReview && (
          <div className="bg-card rounded-2xl p-5 shadow-sm border mb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Ваш отзыв</h3>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= userReview.rating
                          ? 'text-warning fill-warning'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                {userReview.comment && (
                  <p className="text-sm text-muted-foreground">{userReview.comment}</p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => handleEditReview(userReview)}>
                Редактировать
              </Button>
            </div>
          </div>
        )}

        {/* Список отзывов */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Отзывы ({reviews?.total || 0})</h3>
          
          {reviewsLoading && reviewsOffset === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : reviews?.reviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-4xl mb-3">💬</p>
              <p>Пока нет отзывов. Будьте первым!</p>
            </div>
          ) : (
            <>
              {reviews?.reviews
                ?.filter(r => r.user_id !== profile?.id)
                .map((review) => (
                  <div key={review.id} className="bg-card rounded-2xl p-4 border border-border/50">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {review.profiles?.first_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <p className="font-semibold text-sm text-foreground">
                              {review.profiles?.first_name} {review.profiles?.last_name || ''}
                            </p>
                            {review.profiles?.group_name && (
                              <p className="text-xs text-muted-foreground">{review.profiles.group_name}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= review.rating
                                    ? 'text-warning fill-warning'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          {new Date(review.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              
              {/* Кнопка "Показать еще" */}
              {reviews?.hasMore && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setReviewsOffset(prev => prev + reviewsLimit)}
                    disabled={reviewsLoading}
                    className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                  >
                    {reviewsLoading ? 'Загрузка...' : 'Показать еще'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
