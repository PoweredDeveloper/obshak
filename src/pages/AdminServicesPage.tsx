import { AdminLayout } from '@/components/AdminLayout';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useServiceCategories, useAdminServices, useCreateService, useUpdateService, useDeleteService, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/use-services';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function AdminServicesPage() {
  const { data: settings } = useAppSettings();
  const { data: categories } = useServiceCategories();
  const [servicesOffset, setServicesOffset] = useState(0);
  const servicesLimit = 50;
  const { data: servicesData, isLoading: servicesLoading } = useAdminServices({ limit: servicesLimit, offset: servicesOffset });
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category_id: '',
    author_name: '',
    author_username: '',
    author_rating: '0',
    reviews_count: '0',
    is_active: true,
  });

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    icon: '',
  });

  const servicesEnabled = settings?.['features.services_enabled'] === true;

  const toggleServices = async (enabled: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('app_settings')
        .update({ 
          value: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'features.services_enabled');

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success(enabled ? 'Страница "Услуги" включена' : 'Страница "Услуги" выключена');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Ошибка при обновлении настроек');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const serviceData = {
        ...formData,
        price: parseInt(formData.price),
        author_rating: parseFloat(formData.author_rating),
        reviews_count: parseInt(formData.reviews_count),
      };

      if (editingService) {
        await updateService.mutateAsync({ id: editingService.id, ...serviceData });
        toast.success('Услуга обновлена');
      } else {
        await createService.mutateAsync(serviceData as any);
        toast.success('Услуга создана');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Ошибка при сохранении');
    }
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description || '',
      price: service.price.toString(),
      category_id: service.category_id,
      author_name: service.author_name,
      author_username: service.author_username || '',
      author_rating: service.author_rating.toString(),
      reviews_count: service.reviews_count.toString(),
      is_active: service.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить услугу?')) return;
    
    try {
      await deleteService.mutateAsync(id);
      toast.success('Услуга удалена');
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Ошибка при удалении');
    }
  };

  const resetForm = () => {
    setEditingService(null);
    setFormData({
      title: '',
      description: '',
      price: '',
      category_id: '',
      author_name: '',
      author_username: '',
      author_rating: '0',
      reviews_count: '0',
      is_active: true,
    });
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, ...categoryFormData });
        toast.success('Категория обновлена');
      } else {
        await createCategory.mutateAsync(categoryFormData as any);
        toast.success('Категория создана');
      }

      setIsCategoryDialogOpen(false);
      resetCategoryForm();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Ошибка при сохранении');
    }
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      icon: category.icon || '',
    });
    setIsCategoryDialogOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Удалить категорию? Все услуги в этой категории останутся без категории.')) return;
    
    try {
      await deleteCategory.mutateAsync(id);
      toast.success('Категория удалена');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Ошибка при удалении');
    }
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryFormData({
      name: '',
      icon: '',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Управление услугами</h2>

        {/* Переключатель страницы */}
        <div className="bg-card rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Страница "Услуги"</h3>
              <p className="text-sm text-muted-foreground">
                {servicesEnabled ? 'Включено' : 'Выключено'} для всех пользователей
              </p>
            </div>
            <Switch checked={servicesEnabled} onCheckedChange={toggleServices} />
          </div>
        </div>

        {/* Вкладки */}
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="services">Услуги</TabsTrigger>
            <TabsTrigger value="categories">Категории</TabsTrigger>
          </TabsList>

          {/* Вкладка услуг */}
          <TabsContent value="services" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить услугу
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingService ? 'Редактировать услугу' : 'Новая услуга'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Название</label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Описание</label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Цена (₽)</label>
                        <Input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Категория</label>
                        <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите категорию" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Имя исполнителя</label>
                      <Input
                        value={formData.author_name}
                        onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">Telegram</label>
                        <Input
                          value={formData.author_username}
                          onChange={(e) => setFormData({ ...formData, author_username: e.target.value })}
                          placeholder="@username"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Рейтинг</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          value={formData.author_rating}
                          onChange={(e) => setFormData({ ...formData, author_rating: e.target.value })}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Отзывов</label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.reviews_count}
                          onChange={(e) => setFormData({ ...formData, reviews_count: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <label className="text-sm font-medium">Активна</label>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit">
                        {editingService ? 'Сохранить' : 'Создать'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Список услуг */}
            <div className="space-y-2">
              {servicesLoading && servicesOffset === 0 ? (
                <div>Загрузка...</div>
              ) : servicesData?.services.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Нет услуг. Добавьте первую услугу.
                </div>
              ) : (
                <>
                  {servicesData?.services.map((service) => {
                    const category = categories?.find(c => c.id === service.category_id);
                    return (
                      <div key={service.id} className="bg-card rounded-xl p-4 shadow-sm border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm px-2 py-1 rounded bg-primary/10 text-primary">
                                {category?.icon} {category?.name}
                              </span>
                              <span className="text-lg font-bold">{service.price}₽</span>
                              {!service.is_active && (
                                <span className="text-xs px-2 py-1 rounded bg-orange-500/10 text-orange-500">
                                  Неактивна
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold mb-1">{service.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                            <div className="flex items-center gap-2 text-sm">
                              <span>{service.author_name}</span>
                              <span>⭐ {service.author_rating}</span>
                              <span>💬 {service.reviews_count} отзывов</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(service)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(service.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Кнопка "Показать еще" */}
                  {servicesData?.hasMore && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setServicesOffset(prev => prev + servicesLimit)}
                        disabled={servicesLoading}
                        className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                      >
                        {servicesLoading ? 'Загрузка...' : 'Показать еще'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Вкладка категорий */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
                setIsCategoryDialogOpen(open);
                if (!open) resetCategoryForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить категорию
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Редактировать категорию' : 'Новая категория'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Название</label>
                      <Input
                        value={categoryFormData.name}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                        placeholder="Например: РГР"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Эмодзи</label>
                      <Input
                        value={categoryFormData.icon}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value })}
                        placeholder="📝"
                        maxLength={2}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Используйте эмодзи для иконки категории
                      </p>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit">
                        {editingCategory ? 'Сохранить' : 'Создать'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Список категорий */}
            <div className="space-y-2">
              {categories?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Нет категорий. Добавьте первую категорию.
                </div>
              ) : (
                categories?.map((category) => (
                  <div key={category.id} className="bg-card rounded-xl p-4 shadow-sm border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{category.icon}</span>
                        <h3 className="font-semibold">{category.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditCategory(category)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteCategory(category.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
