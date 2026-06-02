import { useState, useEffect } from 'react';
import { Search, ChevronRight, X, Loader2 } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useServiceCategories, useServices } from '@/hooks/use-services';
import { useFeatureFlagState } from '@/hooks/use-app-settings';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

export default function ServicesPage() {
  const navigate = useNavigate();
  const { enabled: servicesEnabled, isReady: servicesFlagReady } = useFeatureFlagState('features.services_enabled');
  const { data: serviceCategories } = useServiceCategories({ enabled: servicesEnabled });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const debouncedServiceSearch = useDebouncedValue(serviceSearchQuery, 500);
  const [serviceOffset, setServiceOffset] = useState(0);
  const serviceLimit = 20;

  const { data: servicesData, isLoading: servicesLoading } = useServices(
    {
      categoryId: selectedCategory || undefined,
      searchQuery: debouncedServiceSearch,
      limit: serviceLimit,
      offset: serviceOffset,
    },
    { enabled: servicesEnabled },
  );

  useEffect(() => {
    setServiceOffset(0);
  }, [selectedCategory, debouncedServiceSearch]);

  if (!servicesFlagReady) {
    return (
      <div className="min-h-screen bg-background pb-24 px-5 pt-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!servicesEnabled) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background pb-24 px-5 pt-6">
      <h1 className="text-xl font-bold text-foreground mb-4">Услуги</h1>

      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск услуг..."
          value={serviceSearchQuery}
          onChange={(e) => setServiceSearchQuery(e.target.value)}
          className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-card border border-border shadow-sm text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
        />
        {serviceSearchQuery && (
          <button
            type="button"
            onClick={() => setServiceSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
        <button
          type="button"
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            selectedCategory === ''
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary/50 text-foreground hover:bg-secondary'
          }`}
        >
          Все
        </button>
        {serviceCategories?.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/50 text-foreground hover:bg-secondary'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {servicesLoading && serviceOffset === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Загрузка услуг...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {servicesData?.services.map((service) => {
              const category = serviceCategories?.find((c) => c.id === service.category_id);
              const ratingLabel =
                service.author_rating != null && !Number.isNaN(Number(service.author_rating))
                  ? Number(service.author_rating).toFixed(1)
                  : '—';
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => navigate(`/service/${service.id}`)}
                  className="w-full bg-card rounded-2xl p-4 border border-border/50 text-left hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-sm text-primary font-medium">
                      <span>{category?.icon}</span>
                      <span>{category?.name}</span>
                    </div>
                    <span className="text-xl font-bold text-foreground">{service.price}₽</span>
                  </div>

                  <h3 className="font-bold text-base mb-2 text-foreground">{service.title}</h3>

                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{service.description}</p>

                  <div className="border-t-2 border-border/40 mb-3" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {service.author_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{service.author_name}</p>
                        <div className="flex items-center gap-1.5 text-xs mt-0.5">
                          <span className="text-warning">⭐</span>
                          <span className="font-semibold text-foreground">{ratingLabel}</span>
                          <span className="text-muted-foreground">💬</span>
                          <span className="text-muted-foreground">{service.reviews_count} отзывов</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </button>
              );
            })}

            {servicesData?.services.length === 0 && (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-sm text-muted-foreground">
                  {serviceSearchQuery ? 'Ничего не найдено' : 'Услуг пока нет'}
                </p>
              </div>
            )}
          </div>

          {servicesData?.hasMore && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setServiceOffset((prev) => prev + serviceLimit)}
                disabled={servicesLoading}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {servicesLoading ? 'Загрузка...' : 'Показать еще'}
              </button>
            </div>
          )}

          {servicesData && servicesData.services.length > 0 && (
            <div className="text-center text-xs text-muted-foreground mt-2">
              Показано {Math.min(serviceOffset + serviceLimit, servicesData.total)} из {servicesData.total}
            </div>
          )}
        </>
      )}
    </div>
  );
}
