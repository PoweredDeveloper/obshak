import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/use-admin';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminSchedule, type GroupedLesson } from '@/hooks/use-admin-schedule';
import { AdminLayout } from '@/components/AdminLayout';
import { AdminClassCard } from '@/components/schedule/AdminClassCard';
import { WeekToggle } from '@/components/schedule/WeekToggle';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash } from 'lucide-react';
import { getCurrentWeekType, CURRENT_SEMESTER } from '@/lib/schedule-data';

interface Group {
  id: string;
  name: string;
}

interface LessonVariant {
  subject: string;
  teacher: string;
  room: string;
  subgroup: number;
}

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const DAY_SHORTS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Стандартное время пар
const LESSON_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: '09:40', end: '11:10' },
  2: { start: '11:20', end: '12:50' },
  3: { start: '13:30', end: '15:00' },
  4: { start: '15:10', end: '16:40' },
  5: { start: '16:50', end: '18:20' },
  6: { start: '18:30', end: '20:00' },
  7: { start: '20:10', end: '21:40' },
  8: { start: '21:50', end: '23:20' },
};

// Цвета для типов занятий
const TYPE_COLORS: Record<string, string> = {
  'Лекции': 'hsl(199, 85%, 55%)',
  'Практические': 'hsl(38, 92%, 55%)',
  'Лабораторные': 'hsl(152, 60%, 48%)',
};

export default function AdminSchedulePage() {
  const { isAdmin, loading } = useAdmin();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const autoWeekType = getCurrentWeekType(CURRENT_SEMESTER);
  const [weekType, setWeekType] = useState<'even' | 'odd'>(autoWeekType);
  const [selectedDay, setSelectedDay] = useState(0);
  
  // Используем новый хук с группировкой
  const { groupedLessons, loading: loadingLessons, refresh: refreshSchedule } = useAdminSchedule(
    selectedGroup?.id || null,
    weekType
  );
  
  const [editingLesson, setEditingLesson] = useState<GroupedLesson | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<GroupedLesson | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  
  // Для редактирования вариантов подгрупп
  const [editingVariants, setEditingVariants] = useState<LessonVariant[]>([]);
  const [editingCommonData, setEditingCommonData] = useState({
    type: 'Лекции',
    lesson_number: 1,
    time_start: '09:40',
    time_end: '11:10',
    week_type: 'Чет',
    start_date: '',
    end_date: '',
  });
  
  // Для добавления занятий с вариантами подгрупп
  const [lessonVariants, setLessonVariants] = useState<LessonVariant[]>([
    { subject: '', teacher: '', room: '', subgroup: 1 }
  ]);
  
  const [commonLessonData, setCommonLessonData] = useState({
    type: 'Лекции',
    lesson_number: 1,
    time_start: '09:40',
    time_end: '11:10',
    week_type: weekType === 'even' ? 'Чет' : 'Неч',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error('Доступ запрещен');
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (profile?.telegram_id) {
      loadAdminId();
    }
  }, [profile?.telegram_id]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredGroups([]);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredGroups(
        groups.filter(g => g.name.toLowerCase().includes(query)).slice(0, 10)
      );
    }
  }, [searchQuery, groups]);

  async function loadGroups() {
    const { data, error } = await supabase
      .from('groups')
      .select('id, name')
      .order('name');

    if (error) {
      toast.error('Ошибка загрузки групп');
      return;
    }

    setGroups(data || []);
  }

  async function loadAdminId() {
    if (!profile?.telegram_id) return;

    const { data, error } = await supabase
      .from('admins')
      .select('id')
      .eq('telegram_id', profile.telegram_id)
      .single();

    if (error) {
      console.error('Error loading admin ID:', error);
      return;
    }

    setAdminId(data?.id || null);
  }

  // Удалили loadLessons - теперь используется хук useAdminSchedule

  function selectGroup(group: Group) {
    setSelectedGroup(group);
    setSearchQuery(group.name);
    setFilteredGroups([]);
  }

  function openEditDialog(lesson: GroupedLesson) {
    setEditingLesson(lesson);
    
    // Подготавливаем данные для редактирования
    const firstRaw = lesson.rawLessons[0];
    setEditingCommonData({
      type: lesson.type,
      lesson_number: lesson.lesson_number,
      time_start: lesson.time_start,
      time_end: lesson.time_end,
      week_type: firstRaw.week_type,
      start_date: firstRaw.start_date || '',
      end_date: firstRaw.end_date || '',
    });
    
    // Если есть варианты подгрупп, загружаем их
    if (lesson.hasSubgroups && lesson.subgroupVariants) {
      setEditingVariants(
        lesson.subgroupVariants.map(v => ({
          subject: v.subject,
          teacher: v.teacher,
          room: v.room,
          subgroup: v.subgroup,
        }))
      );
    } else {
      // Одно занятие
      setEditingVariants([{
        subject: lesson.subject.replace(/\s*\(подгр\.\s*\d+\)/, ''), // убираем "(подгр. X)"
        teacher: lesson.teacher,
        room: lesson.room,
        subgroup: lesson.rawLessons[0].subgroup || 0,
      }]);
    }
    
    setIsEditDialogOpen(true);
  }

  function openDeleteDialog(lesson: GroupedLesson) {
    setDeletingLesson(lesson);
    setIsDeleteDialogOpen(true);
  }

  function openAddDialog() {
    const defaultTime = LESSON_TIMES[1];
    const dbWeekType = weekType === 'even' ? 'Чет' : 'Неч';
    
    setLessonVariants([
      { subject: '', teacher: '', room: '', subgroup: 1 }
    ]);
    
    setCommonLessonData({
      type: 'Лекции',
      lesson_number: 1,
      time_start: defaultTime.start,
      time_end: defaultTime.end,
      week_type: dbWeekType,
      start_date: '',
      end_date: '',
    });
    
    setIsAddDialogOpen(true);
  }

  function handleLessonNumberChange(lessonNumber: number) {
    const times = LESSON_TIMES[lessonNumber];
    setCommonLessonData({
      ...commonLessonData,
      lesson_number: lessonNumber,
      time_start: times.start,
      time_end: times.end,
    });
  }
  
  function addVariant() {
    const nextSubgroup = lessonVariants.length + 1;
    setLessonVariants([
      ...lessonVariants,
      { subject: '', teacher: '', room: '', subgroup: nextSubgroup }
    ]);
  }
  
  function removeVariant(index: number) {
    if (lessonVariants.length === 1) {
      toast.error('Должен быть хотя бы один вариант');
      return;
    }
    setLessonVariants(lessonVariants.filter((_, i) => i !== index));
  }
  
  function updateVariant(index: number, field: keyof LessonVariant, value: string | number) {
    const updated = [...lessonVariants];
    updated[index] = { ...updated[index], [field]: value };
    setLessonVariants(updated);
  }

  function updateEditingVariant(index: number, field: keyof LessonVariant, value: string | number) {
    const updated = [...editingVariants];
    updated[index] = { ...updated[index], [field]: value };
    setEditingVariants(updated);
  }
  
  function addEditingVariant() {
    const nextSubgroup = editingVariants.length + 1;
    setEditingVariants([
      ...editingVariants,
      { subject: '', teacher: '', room: '', subgroup: nextSubgroup }
    ]);
  }
  
  function removeEditingVariant(index: number) {
    if (editingVariants.length === 1) {
      toast.error('Должен быть хотя бы один вариант');
      return;
    }
    setEditingVariants(editingVariants.filter((_, i) => i !== index));
  }

  async function handleSaveLesson() {
    if (!editingLesson) {
      toast.error('Нет данных для сохранения');
      return;
    }

    if (!adminId) {
      toast.error('Ошибка авторизации. Перезагрузите страницу');
      return;
    }

    // Проверяем что все варианты заполнены
    const validVariants = editingVariants.filter(v => v.subject.trim());
    if (validVariants.length === 0) {
      toast.error('Укажите предмет хотя бы для одного варианта');
      return;
    }

    // Получаем старые данные для аудита
    const lessonIds = editingLesson.rawLessons.map(l => l.id);
    const { data: oldLessons, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .in('id', lessonIds);

    if (fetchError) {
      toast.error('Ошибка загрузки данных');
      return;
    }

    // Удаляем старые записи
    const { error: deleteError } = await supabase
      .from('lessons')
      .delete()
      .in('id', lessonIds);

    if (deleteError) {
      toast.error('Ошибка обновления');
      console.error('Delete error:', deleteError);
      return;
    }

    // Создаем новые записи с обновленными данными
    const firstRaw = editingLesson.rawLessons[0];
    const lessonsToInsert = validVariants.map(variant => ({
      group_id: firstRaw.group_id,
      subject: variant.subject.trim(),
      teacher: variant.teacher.trim() || null,
      room: variant.room.trim() || null,
      type: editingCommonData.type,
      day_of_week: firstRaw.day_of_week,
      lesson_number: editingCommonData.lesson_number,
      time_start: editingCommonData.time_start,
      time_end: editingCommonData.time_end,
      week_type: editingCommonData.week_type,
      subgroup: variant.subgroup,
      semester: firstRaw.semester,
      start_date: editingCommonData.start_date || null,
      end_date: editingCommonData.end_date || null,
    }));

    const { data: insertedLessons, error: insertError } = await supabase
      .from('lessons')
      .insert(lessonsToInsert)
      .select();

    if (insertError) {
      toast.error('Ошибка сохранения');
      console.error('Insert error:', insertError);
      return;
    }

    // Записываем в аудит-лог
    for (const oldLesson of oldLessons || []) {
      await supabase
        .from('schedule_audit_log')
        .insert({
          admin_id: adminId,
          action: 'UPDATE',
          table_name: 'lessons',
          record_id: oldLesson.id,
          old_data: oldLesson,
          new_data: { deleted_and_recreated: true },
        });
    }

    for (const newLesson of insertedLessons || []) {
      await supabase
        .from('schedule_audit_log')
        .insert({
          admin_id: adminId,
          action: 'INSERT',
          table_name: 'lessons',
          record_id: newLesson.id,
          old_data: null,
          new_data: newLesson,
        });
    }

    toast.success('Занятие обновлено');
    setIsEditDialogOpen(false);
    refreshSchedule();
  }

  async function handleDeleteLesson() {
    if (!deletingLesson) {
      toast.error('Нет данных для удаления');
      return;
    }

    if (!adminId) {
      toast.error('Ошибка авторизации. Перезагрузите страницу');
      return;
    }

    // Если это сгруппированное занятие, удаляем все записи
    const lessonIds = deletingLesson.rawLessons.map(l => l.id);

    // Получаем данные для аудита
    const { data: oldLessons, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .in('id', lessonIds);

    if (fetchError) {
      toast.error('Ошибка загрузки данных');
      return;
    }

    // Удаляем все связанные занятия
    const { error: deleteError } = await supabase
      .from('lessons')
      .delete()
      .in('id', lessonIds);

    if (deleteError) {
      toast.error('Ошибка удаления');
      console.error('Delete error:', deleteError);
      return;
    }

    // Записываем в аудит-лог для каждой записи
    for (const oldLesson of oldLessons || []) {
      await supabase
        .from('schedule_audit_log')
        .insert({
          admin_id: adminId,
          action: 'DELETE',
          table_name: 'lessons',
          record_id: oldLesson.id,
          old_data: oldLesson,
          new_data: null,
        });
    }

    toast.success('Занятие удалено');
    setIsDeleteDialogOpen(false);
    refreshSchedule();
  }

  async function handleAddLesson() {
    if (!selectedGroup) {
      toast.error('Группа не выбрана');
      return;
    }

    if (!adminId) {
      toast.error('Ошибка авторизации. Перезагрузите страницу');
      return;
    }

    // Проверяем что хотя бы один вариант заполнен
    const validVariants = lessonVariants.filter(v => v.subject.trim());
    if (validVariants.length === 0) {
      toast.error('Укажите предмет хотя бы для одного варианта');
      return;
    }

    // Создаем занятия для каждого варианта
    const lessonsToInsert = validVariants.map(variant => ({
      group_id: selectedGroup.id,
      subject: variant.subject.trim(),
      teacher: variant.teacher.trim() || null,
      room: variant.room.trim() || null,
      type: commonLessonData.type,
      day_of_week: selectedDay + 1,
      lesson_number: commonLessonData.lesson_number,
      time_start: commonLessonData.time_start,
      time_end: commonLessonData.time_end,
      week_type: commonLessonData.week_type,
      subgroup: variant.subgroup,
      semester: 'Весенний',
      start_date: commonLessonData.start_date || null,
      end_date: commonLessonData.end_date || null,
    }));

    const { data: insertedLessons, error: insertError } = await supabase
      .from('lessons')
      .insert(lessonsToInsert)
      .select();

    if (insertError) {
      toast.error('Ошибка добавления');
      console.error('Insert error:', insertError);
      return;
    }

    // Записываем в аудит-лог для каждого занятия
    for (const lesson of insertedLessons || []) {
      await supabase
        .from('schedule_audit_log')
        .insert({
          admin_id: adminId,
          action: 'INSERT',
          table_name: 'lessons',
          record_id: lesson.id,
          old_data: null,
          new_data: lesson,
        });
    }

    const message = validVariants.length === 1 
      ? 'Занятие добавлено' 
      : `Добавлено ${validVariants.length} варианта занятия`;
    toast.success(message);
    setIsAddDialogOpen(false);
    refreshSchedule();
  }

  // Фильтруем сгруппированные занятия по выбранному дню
  const todayLessons = groupedLessons.filter(
    l => l.rawLessons[0].day_of_week === selectedDay + 1
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-6">Управление расписанием</h2>

        {/* Поиск группы */}
        <Card className="p-4 mb-6">
          <Label>Поиск группы</Label>
          <Input
            type="text"
            placeholder="Введите название группы (например, 25СЖ01)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-2"
          />
          
          {filteredGroups.length > 0 && (
            <div className="border rounded-md max-h-60 overflow-y-auto">
              {filteredGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => selectGroup(group)}
                  className="w-full text-left px-4 py-2 hover:bg-secondary transition-colors"
                >
                  {group.name}
                </button>
              ))}
            </div>
          )}
        </Card>

        {selectedGroup && (
          <>
            {/* Заголовок с названием группы */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4">{selectedGroup.name}</h3>
              
              {/* Переключатель недели */}
              <WeekToggle
                weekType={weekType}
                onToggle={() => setWeekType(weekType === 'even' ? 'odd' : 'even')}
              />
            </div>

            {/* Селектор дня */}
            <div className="mb-4">
              <div className="flex gap-1.5 px-1 overflow-x-auto scrollbar-hide">
                {DAY_SHORTS.map((label, i) => {
                  const isSelected = i === selectedDay;
                  // Считаем уникальные занятия (сгруппированные)
                  const dayLessons = groupedLessons.filter(l => l.rawLessons[0].day_of_week === i + 1);
                  const classCount = dayLessons.length;

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(i)}
                      className={`relative flex flex-col items-center min-w-[48px] py-2 px-1 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-card-foreground hover:bg-secondary'
                      }`}
                    >
                      <span className="text-[10px] font-medium opacity-70">{label}</span>
                      <span className="text-sm font-bold mt-0.5">
                        {classCount === 0 ? '🏖️' : classCount <= 2 ? '😎' : classCount <= 3 ? '📚' : '💀'}
                      </span>
                      <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {classCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Кнопка добавления занятия */}
            <div className="flex justify-end mb-4">
              <Button onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить занятие
              </Button>
            </div>

            {/* Расписание */}
            {loadingLessons ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Загрузка...</p>
              </div>
            ) : todayLessons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Нет занятий в {DAYS[selectedDay].toLowerCase()}
                </p>
                <Button onClick={openAddDialog} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить первое занятие
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {todayLessons.map((lesson, index) => (
                  <AdminClassCard
                    key={lesson.id}
                    lesson={lesson}
                    index={index}
                    color={TYPE_COLORS[lesson.type] || 'hsl(270, 60%, 60%)'}
                    onEdit={openEditDialog}
                    onDelete={openDeleteDialog}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Диалог редактирования */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Редактировать занятие</DialogTitle>
            </DialogHeader>
            {editingLesson && (
              <div className="space-y-4">
                {/* Общие параметры */}
                <div className="p-3 bg-secondary/30 rounded-lg space-y-4">
                  <p className="text-sm font-medium">Общие параметры</p>
                  
                  <div>
                    <Label>Тип занятия</Label>
                    <Select
                      value={editingCommonData.type}
                      onValueChange={(value) => setEditingCommonData({ ...editingCommonData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Лекции">Лекции</SelectItem>
                        <SelectItem value="Практические">Практические</SelectItem>
                        <SelectItem value="Лабораторные">Лабораторные</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Номер пары</Label>
                      <Select
                        value={editingCommonData.lesson_number.toString()}
                        onValueChange={(value) => {
                          const lessonNum = parseInt(value);
                          const times = LESSON_TIMES[lessonNum];
                          setEditingCommonData({
                            ...editingCommonData,
                            lesson_number: lessonNum,
                            time_start: times.start,
                            time_end: times.end,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 пара (09:40-11:10)</SelectItem>
                          <SelectItem value="2">2 пара (11:20-12:50)</SelectItem>
                          <SelectItem value="3">3 пара (13:30-15:00)</SelectItem>
                          <SelectItem value="4">4 пара (15:10-16:40)</SelectItem>
                          <SelectItem value="5">5 пара (16:50-18:20)</SelectItem>
                          <SelectItem value="6">6 пара (18:30-20:00)</SelectItem>
                          <SelectItem value="7">7 пара (20:10-21:40)</SelectItem>
                          <SelectItem value="8">8 пара (21:50-23:20)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Неделя</Label>
                      <Select
                        value={editingCommonData.week_type}
                        onValueChange={(value) => setEditingCommonData({ ...editingCommonData, week_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Чет">Четная неделя</SelectItem>
                          <SelectItem value="Неч">Нечетная неделя</SelectItem>
                          <SelectItem value="Обе">Обе недели</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Время начала</Label>
                      <Input
                        type="time"
                        value={editingCommonData.time_start}
                        onChange={(e) => setEditingCommonData({ ...editingCommonData, time_start: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Время окончания</Label>
                      <Input
                        type="time"
                        value={editingCommonData.time_end}
                        onChange={(e) => setEditingCommonData({ ...editingCommonData, time_end: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Дата начала (необязательно)</Label>
                      <Input
                        type="date"
                        value={editingCommonData.start_date}
                        onChange={(e) => setEditingCommonData({ ...editingCommonData, start_date: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Дата окончания (необязательно)</Label>
                      <Input
                        type="date"
                        value={editingCommonData.end_date}
                        onChange={(e) => setEditingCommonData({ ...editingCommonData, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Варианты */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {editingVariants.length === 1 ? 'Данные занятия' : 'Варианты по подгруппам'}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addEditingVariant}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Добавить вариант
                    </Button>
                  </div>

                  {editingVariants.map((variant, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                          {editingVariants.length === 1 
                            ? (variant.subgroup === 0 ? 'Для всей группы' : `Подгруппа ${variant.subgroup}`)
                            : `Подгруппа ${variant.subgroup}`
                          }
                        </span>
                        {editingVariants.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs text-destructive"
                            onClick={() => removeEditingVariant(index)}
                          >
                            <Trash className="w-3 h-3 mr-1" />
                            Удалить
                          </Button>
                        )}
                      </div>

                      <div>
                        <Label>Предмет *</Label>
                        <Input
                          placeholder="Например: Математика"
                          value={variant.subject}
                          onChange={(e) => updateEditingVariant(index, 'subject', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label>Преподаватель</Label>
                        <Input
                          placeholder="Например: проф. Иванов И.И."
                          value={variant.teacher}
                          onChange={(e) => updateEditingVariant(index, 'teacher', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label>Аудитория</Label>
                        <Input
                          placeholder="Например: 2-501"
                          value={variant.room}
                          onChange={(e) => updateEditingVariant(index, 'room', e.target.value)}
                        />
                      </div>

                      {editingVariants.length > 1 && (
                        <div>
                          <Label>Номер подгруппы</Label>
                          <Select
                            value={variant.subgroup.toString()}
                            onValueChange={(value) => updateEditingVariant(index, 'subgroup', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Подгруппа 1</SelectItem>
                              <SelectItem value="2">Подгруппа 2</SelectItem>
                              <SelectItem value="3">Подгруппа 3</SelectItem>
                              <SelectItem value="4">Подгруппа 4</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSaveLesson}>
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Диалог удаления */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Удалить занятие?</DialogTitle>
            </DialogHeader>
            {deletingLesson && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Вы уверены, что хотите удалить это занятие?
                </p>
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="font-medium">{deletingLesson.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {DAYS[deletingLesson.rawLessons[0].day_of_week - 1]}, пара {deletingLesson.lesson_number}
                  </p>
                  {deletingLesson.hasSubgroups && deletingLesson.subgroupVariants && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs font-medium mb-1">Будут удалены все варианты:</p>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {deletingLesson.subgroupVariants.map((variant, idx) => (
                          <div key={idx}>
                            • Подгр. {variant.subgroup}: {variant.subject}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Отмена
              </Button>
              <Button variant="destructive" onClick={handleDeleteLesson}>
                Удалить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Диалог добавления занятия */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Добавить занятие - {DAYS[selectedDay]}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Общие параметры */}
              <div className="p-3 bg-secondary/30 rounded-lg space-y-4">
                <p className="text-sm font-medium">Общие параметры</p>
                
                <div>
                  <Label>Тип занятия</Label>
                  <Select
                    value={commonLessonData.type}
                    onValueChange={(value) => setCommonLessonData({ ...commonLessonData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Лекции">Лекции</SelectItem>
                      <SelectItem value="Практические">Практические</SelectItem>
                      <SelectItem value="Лабораторные">Лабораторные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Номер пары</Label>
                    <Select
                      value={commonLessonData.lesson_number.toString()}
                      onValueChange={(value) => handleLessonNumberChange(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 пара (09:40-11:10)</SelectItem>
                        <SelectItem value="2">2 пара (11:20-12:50)</SelectItem>
                        <SelectItem value="3">3 пара (13:30-15:00)</SelectItem>
                        <SelectItem value="4">4 пара (15:10-16:40)</SelectItem>
                        <SelectItem value="5">5 пара (16:50-18:20)</SelectItem>
                        <SelectItem value="6">6 пара (18:30-20:00)</SelectItem>
                        <SelectItem value="7">7 пара (20:10-21:40)</SelectItem>
                        <SelectItem value="8">8 пара (21:50-23:20)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Неделя</Label>
                    <Select
                      value={commonLessonData.week_type}
                      onValueChange={(value) => setCommonLessonData({ ...commonLessonData, week_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Чет">Четная неделя</SelectItem>
                        <SelectItem value="Неч">Нечетная неделя</SelectItem>
                        <SelectItem value="Обе">Обе недели</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Время начала</Label>
                    <Input
                      type="time"
                      value={commonLessonData.time_start}
                      onChange={(e) => setCommonLessonData({ ...commonLessonData, time_start: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Время окончания</Label>
                    <Input
                      type="time"
                      value={commonLessonData.time_end}
                      onChange={(e) => setCommonLessonData({ ...commonLessonData, time_end: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Дата начала (необязательно)</Label>
                    <Input
                      type="date"
                      value={commonLessonData.start_date}
                      onChange={(e) => setCommonLessonData({ ...commonLessonData, start_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Дата окончания (необязательно)</Label>
                    <Input
                      type="date"
                      value={commonLessonData.end_date}
                      onChange={(e) => setCommonLessonData({ ...commonLessonData, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Варианты для подгрупп */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {lessonVariants.length === 1 ? 'Занятие' : 'Варианты по подгруппам'}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addVariant}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Добавить вариант
                  </Button>
                </div>

                {lessonVariants.map((variant, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">
                        {lessonVariants.length === 1 ? 'Для всей группы' : `Подгруппа ${variant.subgroup}`}
                      </span>
                      {lessonVariants.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs text-destructive"
                          onClick={() => removeVariant(index)}
                        >
                          <Trash className="w-3 h-3 mr-1" />
                          Удалить
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label>Предмет *</Label>
                      <Input
                        placeholder="Например: Математика"
                        value={variant.subject}
                        onChange={(e) => updateVariant(index, 'subject', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Преподаватель</Label>
                      <Input
                        placeholder="Например: проф. Иванов И.И."
                        value={variant.teacher}
                        onChange={(e) => updateVariant(index, 'teacher', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Аудитория</Label>
                      <Input
                        placeholder="Например: 2-501"
                        value={variant.room}
                        onChange={(e) => updateVariant(index, 'room', e.target.value)}
                      />
                    </div>

                    {lessonVariants.length > 1 && (
                      <div>
                        <Label>Номер подгруппы</Label>
                        <Select
                          value={variant.subgroup.toString()}
                          onValueChange={(value) => updateVariant(index, 'subgroup', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Подгруппа 1</SelectItem>
                            <SelectItem value="2">Подгруппа 2</SelectItem>
                            <SelectItem value="3">Подгруппа 3</SelectItem>
                            <SelectItem value="4">Подгруппа 4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleAddLesson}>
                Добавить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
