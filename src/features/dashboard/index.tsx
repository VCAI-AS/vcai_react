import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  PlusCircle,
  Copy,
  AlertCircle,
  Edit,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  Link as LinkIcon,
  FileText,
  BarChart,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  Wallet,
  Info,
  Loader2,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import ajax from '@/lib/request/ajax'
// 假设你使用了 sonner 或者 useToast
import { cn } from '@/lib/utils'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
// UI Components (Shadcn)
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
// 注意：Shadcn Calendar 通常是 date-range-picker，这里可能需要自定义热力图
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
// Types
import { TaskItem, TaskPriority, TaskStatus } from './types'

// --- 常量定义 ---
const PRIORITY_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '高', color: 'text-red-500 font-bold' },
  2: { label: '中', color: 'text-gray-700' },
  3: { label: '低', color: 'text-gray-400' },
}

const STATUS_MAP: Record<number, { label: string; color: string; bg: string }> =
  {
    1: { label: '待开始', color: 'text-gray-600', bg: 'bg-gray-100' },
    2: { label: '进行中', color: 'text-blue-600', bg: 'bg-blue-100' },
    3: { label: '已暂停', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    4: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100' },
    5: { label: '已验收', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    6: { label: '重做', color: 'text-orange-600', bg: 'bg-orange-100' },
  }
const topNav = [
  {
    title: '飞轮挖矿',
    href: 'dashboard/overview',
    isActive: false,
    disabled: false,
  },
  {
    title: '知识库',
    href: 'dashboard/customers',
    isActive: false,
    disabled: false,
  },
]

export function Dashboard() {
  const {
    auth: { user },
  } = useAuthStore()
  const queryClient = useQueryClient()

  // State
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [sideViewFilter, setSideViewFilter] = useState<string | undefined>(
    undefined
  )
  const [rightTab, setRightTab] = useState('strategy')

  // 权限控制
  const canEdit = useMemo(() => {
    return !sideViewFilter || Number(sideViewFilter) === user?.userId
  }, [sideViewFilter, user])

  // --- API Queries ---

  // 1. 获取团队成员
  const { data: teamUsers } = useQuery({
    queryKey: ['teamUsers'],
    queryFn: async () => {
      const res: any = await ajax.get('/tacticTask/getAllTeamsUser')
      return res || []
    },
  })

  // 2. 获取月/周任务
  const { data: mwTasks, refetch: refetchMw } = useQuery({
    queryKey: ['mwTasks', sideViewFilter],
    queryFn: async () => {
      const res: any = await ajax.get('/tacticTask/getMothWeekTasks', {
        userId: sideViewFilter,
      })
      const monthly: TaskItem[] = []
      const weekly: TaskItem[] = []
      ;(res || []).forEach((item: any) => {
        const task = { ...item, id: item.taskId, status: item.taskStatus }
        if (item.taskType === 3) monthly.push(task)
        if (item.taskType === 4) {
          // 处理百分比字符串
          const p = Number(item.completionRate?.replace(/[^0-9.]/g, '') || 0)
          weekly.push({ ...task, percent: p })
        }
      })
      return { monthly, weekly }
    },
  })

  // 3. 获取日任务
  const {
    data: dayTasks,
    isLoading: dayLoading,
    refetch: refetchDay,
  } = useQuery({
    queryKey: [
      'dayTasks',
      dayjs(selectedDay).format('YYYYMMDD'),
      sideViewFilter,
    ],
    queryFn: async () => {
      const dateStr = dayjs(selectedDay).format('YYYYMMDD')
      const res: any = await ajax.get(`/tacticTask/getDayTasks/${dateStr}`, {
        userId: sideViewFilter,
      })
      return (res || []).map((item: any) => ({
        ...item,
        id: item.taskId,
        status: item.approveStatus === 3 ? 5 : item.taskStatus, // 审批通过视为已验收
        files: item.files || [],
        from: item.startTime?.slice(0, 5),
        to: item.endTime?.slice(0, 5),
      })) as TaskItem[]
    },
  })

  // 4. 收益日历数据
  const [calendarMonth, setCalendarMonth] = useState(dayjs())
  const { data: incomeData } = useQuery({
    queryKey: ['income', calendarMonth.format('YYYYMM'), sideViewFilter],
    queryFn: async () => {
      const res: any = await ajax.get(
        `/tacticTask/getDailyOutput/${calendarMonth.format('YYYYMM')}`,
        {
          userId: sideViewFilter,
        }
      )
      // 转换为 Map 方便查找
      const map: Record<string, any> = {}
      ;(res || []).forEach((d: any) => {
        map[d.first] = {
          vcc: d.second,
          completed: d.third,
          incomplete: d.fourth,
        } // first is date like 20260227
      })
      return map
    },
  })

  // --- Mutations (Actions) ---

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      score,
    }: {
      id: number
      status: number
      score?: number
    }) => {
      if (status === 0 || status === -1) {
        return ajax.post(`/tacticTask/delTask/?taskId=${id}`)
      }
      return ajax.post('/tacticTask/setTaskStatus', {
        taskId: id,
        taskStatus: status,
        selfScore: score,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mwTasks'] })
      queryClient.invalidateQueries({ queryKey: ['dayTasks'] })
      toast.success('操作成功')
    },
    onError: () => toast.error('操作失败'),
  })

  // --- Handlers ---

  const handleCopy = async (tasks: TaskItem[] | undefined) => {
    if (!tasks || tasks.length === 0) return
    const text = tasks
      .map((t, i) => `${i + 1}. ${t.title} ${t.desc ? `(${t.desc})` : ''}`)
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast.success('复制成功')
    } catch (e) {
      toast.error('复制失败')
    }
  }

  const handleUserChange = (val: string) => {
    setSideViewFilter(val === 'all' ? undefined : val)
  }

  // 模拟 Vue 的 CreateTaskModal
  const openCreateModal = (level: number) => {
    toast.info(`打开创建 L${level} 任务弹窗 (需迁移 CreateTaskModal)`)
    // 这里应该 setModalOpen(true) 并传递 level
  }

  // --- Render Helpers ---

  // 渲染日历热力图单元格
  const renderCalendarCell = (date: Date) => {
    const key = dayjs(date).format('YYYYMMDD')
    const data = incomeData?.[key]

    let bgClass = 'hover:bg-gray-100'
    if (data) {
      if (data.completed >= 6) bgClass = 'bg-emerald-100 border-emerald-300'
      else if (data.completed >= 3) bgClass = 'bg-blue-100 border-blue-300'
      else bgClass = 'bg-red-50 border-red-200'
    }

    return (
      <div
        className={cn(
          'relative flex h-full min-h-[40px] w-full cursor-pointer flex-col items-center justify-center rounded-md border border-transparent text-xs transition-all',
          bgClass,
          dayjs(date).isSame(selectedDay, 'day') &&
            'ring-2 ring-primary ring-offset-1'
        )}
        onClick={() => setSelectedDay(date)}
      >
        <span className={cn('font-medium', !data && 'text-gray-300')}>
          {date.getDate()}
        </span>
        {data && (
          <div className='mt-1 flex origin-bottom scale-75 transform gap-1'>
            {data.completed > 0 && (
              <span className='flex items-center text-green-600'>
                <ThumbsUp className='mr-[1px] h-3 w-3' />
                {data.completed}
              </span>
            )}
            {data.vcc > 0 && (
              <span className='flex items-center text-amber-500'>
                <Wallet className='mr-[1px] h-3 w-3' />
                {data.vcc}
              </span>
            )}
          </div>
        )}
        {data?.incomplete && (
          <div className='absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500' />
        )}
      </div>
    )
  }

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className='ms-auto flex items-center space-x-4 sm:ms-0 md:ms-auto'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <div className='font-sans text-slate-900'>
          <div className='mx-auto grid grid-cols-1 gap-6 xl:grid-cols-3'>
            {/* === Left Column: Tasks === */}
            <div className='space-y-6 xl:col-span-2'>
              <TooltipProvider delayDuration={300}>
                <Accordion
                  type='multiple'
                  defaultValue={['daily', 'weekly', 'monthly']}
                  className='space-y-4'
                >
                  {/* 1. Monthly Tasks */}
                  <TaskSection
                    value='monthly'
                    title='月目标 (飞轮)'
                    icon={
                      <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-orange-400 font-bold text-white'>
                        月
                      </div>
                    }
                    canEdit={canEdit}
                    onAdd={() => openCreateModal(3)}
                    onCopy={() => handleCopy(mwTasks?.monthly)}
                  >
                    <SimpleTaskTable
                      data={mwTasks?.monthly || []}
                      columns={['index', 'title', 'priority']}
                      canEdit={canEdit}
                      onEdit={(task) => toast.info(`编辑: ${task.title}`)}
                    />
                  </TaskSection>

                  {/* 2. Weekly Tasks */}
                  <TaskSection
                    value='weekly'
                    title='周目标 (飞轮)'
                    icon={
                      <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 font-bold text-white'>
                        周
                      </div>
                    }
                    canEdit={canEdit}
                    onAdd={() => openCreateModal(4)}
                    onCopy={() => handleCopy(mwTasks?.weekly)}
                  >
                    <SimpleTaskTable
                      data={mwTasks?.weekly || []}
                      columns={[
                        'index',
                        'title',
                        'priority',
                        'status',
                        'percent',
                      ]}
                      canEdit={canEdit}
                      onEdit={(task) => toast.info(`编辑: ${task.title}`)}
                    />
                  </TaskSection>

                  {/* 3. Daily Tasks (The big one) */}
                  <TaskSection
                    value='daily'
                    title={
                      <div className='flex items-center gap-2'>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant='ghost'
                              className='h-auto p-0 text-lg font-bold hover:bg-transparent'
                            >
                              {dayjs(selectedDay).format('M月D日')} 飞轮
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className='w-auto p-0'>
                            <Calendar
                              mode='single'
                              selected={selectedDay}
                              onSelect={(d) => d && setSelectedDay(d)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    }
                    icon={
                      <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 font-bold text-white'>
                        日
                      </div>
                    }
                    canEdit={canEdit}
                    onAdd={() => openCreateModal(5)}
                    onCopy={() => handleCopy(dayTasks)}
                    disabledCollapse
                  >
                    {dayLoading ? (
                      <div className='flex justify-center py-8'>
                        <Loader2 className='animate-spin text-primary' />
                      </div>
                    ) : (
                      <div className='space-y-1'>
                        {/* Header */}
                        <div className='grid grid-cols-12 gap-2 rounded-t-md bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500'>
                          <div className='col-span-5'>任务</div>
                          <div className='col-span-2 text-center'>
                            预估Token
                          </div>
                          <div className='col-span-1 text-center'>紧急</div>
                          <div className='col-span-2 text-center'>状态</div>
                          <div className='col-span-2 text-center'>操作</div>
                        </div>
                        {/* Body */}
                        {dayTasks?.map((task, idx) => (
                          <DailyTaskRow
                            key={task.id || idx}
                            task={task}
                            index={idx}
                            canEdit={canEdit}
                            onEdit={() => toast.info('编辑任务')}
                            onUpdateStatus={(id, status, score) =>
                              updateStatusMutation.mutate({ id, status, score })
                            }
                          />
                        ))}
                        {!dayTasks?.length && (
                          <div className='py-8 text-center text-sm text-gray-400'>
                            暂无日任务
                          </div>
                        )}
                      </div>
                    )}
                  </TaskSection>
                </Accordion>
              </TooltipProvider>
            </div>

            {/* === Right Column: Sidebar === */}
            <div className='space-y-4 xl:col-span-1'>
              {/* 1. Main Interaction Area */}
              <div className='flex min-h-[500px] flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm'>
                <div className='border-b border-slate-100 p-4'>
                  <Select
                    value={sideViewFilter || 'all'}
                    onValueChange={handleUserChange}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='选择用户 (全部)' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>显示全部</SelectItem>
                      {teamUsers?.map((u: any) => (
                        <SelectItem key={u.key} value={String(u.key)}>
                          {u.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Tabs
                  value={rightTab}
                  onValueChange={setRightTab}
                  className='flex flex-1 flex-col'
                >
                  <div className='px-4 pt-2'>
                    <TabsList className='grid w-full grid-cols-4 bg-slate-100/50'>
                      <TabsTrigger value='strategy'>战略</TabsTrigger>
                      <TabsTrigger value='todo'>待办</TabsTrigger>
                      <TabsTrigger value='files'>文件</TabsTrigger>
                      <TabsTrigger value='approve'>审批</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className='max-h-[600px] flex-1 overflow-y-auto bg-white p-4'>
                    <TabsContent value='strategy' className='mt-0 h-full'>
                      <StrategyPanel
                        isAdmin={user?.admin === 1}
                        onAdd={() => openCreateModal(1)}
                      />
                    </TabsContent>

                    <TabsContent value='todo' className='mt-0 h-full'>
                      <TodoPanel />
                    </TabsContent>

                    <TabsContent value='approve' className='mt-0 h-full'>
                      <ApprovalList />
                    </TabsContent>

                    {/* 其他 Tabs 省略... */}
                  </div>
                </Tabs>
              </div>

              {/* 2. Heatmap Calendar */}
              <div className='rounded-xl border border-slate-100 bg-white p-4 shadow-sm'>
                <div className='mb-4 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div className='flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-orange-400 to-red-500 text-white'>
                      <BarChart size={18} />
                    </div>
                    <span className='font-bold'>收益日历</span>
                  </div>
                  <div className='flex gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6'
                      onClick={() =>
                        setCalendarMonth((prev) => prev.subtract(1, 'month'))
                      }
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <span className='text-sm font-medium'>
                      {calendarMonth.format('YYYY年MM月')}
                    </span>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6'
                      onClick={() =>
                        setCalendarMonth((prev) => prev.add(1, 'month'))
                      }
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>

                {/* Custom Grid Calendar */}
                <div className='grid grid-cols-7 gap-2'>
                  {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                    <div
                      key={d}
                      className='mb-2 text-center text-xs text-gray-400'
                    >
                      {d}
                    </div>
                  ))}
                  {/* Padding for start of month */}
                  {Array.from({
                    length: calendarMonth.startOf('month').day(),
                  }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {/* Days */}
                  {Array.from({ length: calendarMonth.daysInMonth() }).map(
                    (_, i) => {
                      const date = calendarMonth.date(i + 1).toDate()
                      return (
                        <div key={i} className='aspect-square'>
                          {renderCalendarCell(date)}
                        </div>
                      )
                    }
                  )}
                </div>
                <div className='mt-4 text-center text-xs text-gray-400'>
                  点击格子查看任务详情
                </div>
              </div>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}

// --- Sub Components ---

// 1. Task Section Wrapper (Accordion Item)
const TaskSection = ({
  value,
  title,
  icon,
  children,
  onAdd,
  onCopy,
  canEdit,
  disabledCollapse,
}: any) => (
  <AccordionItem
    value={value}
    className='rounded-xl border border-slate-100 bg-white px-4 shadow-sm data-[state=open]:pb-4'
  >
    <div className='flex items-center justify-between py-4'>
      <div className='flex items-center gap-3'>
        {icon}
        <span className='text-lg font-bold text-slate-800'>{title}</span>
      </div>
      <div className='flex items-center gap-0'>
        {canEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size='icon'
                variant='ghost'
                className='text-primary hover:bg-blue-50'
                onClick={(e) => {
                  e.stopPropagation()
                  onAdd()
                }}
              >
                <PlusCircle size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>新增任务</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size='icon'
              variant='ghost'
              className='text-gray-400 hover:text-gray-600'
              onClick={(e) => {
                e.stopPropagation()
                onCopy()
              }}
            >
              <Copy size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>一键复制</TooltipContent>
        </Tooltip>
        {!disabledCollapse && (
          <AccordionTrigger className='flex h-9 w-9 items-center justify-center p-0 hover:bg-slate-100' />
        )}
      </div>
    </div>
    <AccordionContent className='pt-0 pb-0'>{children}</AccordionContent>
  </AccordionItem>
)

// 2. Simple Table for Month/Week
const SimpleTaskTable = ({ data, columns, canEdit, onEdit }: any) => (
  <div className='w-full'>
    {data.map((item: TaskItem, idx: number) => (
      <div
        key={item.id}
        className='group flex items-center rounded-md border-b border-gray-100 px-2 py-3 transition-colors last:border-0 hover:bg-slate-50'
      >
        <div className='w-8 font-mono text-xs text-gray-400'>
          {(idx + 1).toString().padStart(2, '0')}
        </div>
        <div className='min-w-0 flex-1 pr-4'>
          <div className='flex items-center gap-2'>
            <span className='truncate text-sm font-medium'>{item.title}</span>
            {item.description && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle size={14} className='text-gray-300' />
                </TooltipTrigger>
                <TooltipContent>{item.description}</TooltipContent>
              </Tooltip>
            )}
            {canEdit && (
              <Edit
                size={14}
                className='cursor-pointer text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary'
                onClick={() => onEdit(item)}
              />
            )}
          </div>
        </div>
        {columns.includes('priority') && (
          <div
            className={cn(
              'w-12 text-center text-xs',
              PRIORITY_MAP[item.priority].color
            )}
          >
            {PRIORITY_MAP[item.priority].label}
          </div>
        )}
        {columns.includes('status') && (
          <div className='w-20 text-center'>
            <Badge
              variant='outline'
              className={cn(
                'border-0 text-[10px] font-normal',
                STATUS_MAP[item.status]?.bg,
                STATUS_MAP[item.status]?.color
              )}
            >
              {STATUS_MAP[item.status]?.label}
            </Badge>
          </div>
        )}
        {columns.includes('percent') && (
          <div className='w-24 px-2'>
            <Progress
              value={item.percent || 0}
              className={STATUS_MAP[item.status]?.color?.replace(
                'text-',
                'bg-'
              )}
            />
          </div>
        )}
      </div>
    ))}
    {data.length === 0 && (
      <div className='py-4 text-center text-sm text-gray-300'>暂无数据</div>
    )}
  </div>
)

// 3. Daily Task Row (Complex)
const DailyTaskRow = ({
  task,
  index,
  canEdit,
  onEdit,
  onUpdateStatus,
}: any) => {
  const [score, setScore] = useState<string>('')

  return (
    <div className='mb-2 grid grid-cols-12 items-center gap-2 rounded-md border-b border-gray-100 bg-white px-4 py-3 shadow-sm transition-colors hover:bg-slate-50'>
      {/* Title Section */}
      <div className='col-span-5 min-w-0'>
        <div className='mb-1 flex items-center gap-2'>
          <span className='px-1.5 text-[10px] text-slate-600'>{index + 1}</span>
          <span
            className='truncate text-sm font-medium text-slate-700'
            title={task.title}
          >
            {task.title}
          </span>
          {task.description && (
            <Tooltip>
              <TooltipTrigger>
                <Info size={14} className='text-gray-300' />
              </TooltipTrigger>
              <TooltipContent>{task.description}</TooltipContent>
            </Tooltip>
          )}
          {canEdit && (
            <Edit
              size={14}
              className='cursor-pointer text-gray-300 hover:text-primary'
              onClick={onEdit}
            />
          )}
        </div>
        <div className='flex items-center gap-2 text-xs text-gray-400'>
          <Clock size={12} />
          <span>
            {task.from}~{task.to}
          </span>
          {task.files?.length > 0 && (
            <span className='ml-2 flex items-center gap-1 text-blue-400'>
              <LinkIcon size={12} /> {task.files.length} 文件
            </span>
          )}
        </div>
        {task.remark && (
          <div className='mt-1 text-xs text-red-500'>驳回: {task.remark}</div>
        )}
      </div>

      {/* Token */}
      <div className='col-span-2 text-center font-mono text-sm text-gray-600'>
        {task.esTokenValue || '-'}
      </div>

      {/* Priority */}
      <div className='col-span-1 text-center text-xs'>
        <span className={cn(PRIORITY_MAP[task.priority].color)}>
          {PRIORITY_MAP[task.priority].label}
        </span>
      </div>

      {/* Status */}
      <div className='col-span-2 text-center'>
        <Badge
          variant='secondary'
          className={cn(
            'font-normal',
            STATUS_MAP[task.status]?.bg,
            STATUS_MAP[task.status]?.color
          )}
        >
          {STATUS_MAP[task.status]?.label}
        </Badge>
      </div>

      {/* Actions (Complex State Machine) */}
      <div className='col-span-2 flex justify-center gap-1'>
        {canEdit && (
          <>
            {/* 待开始 (1) -> 删除 / 开始 */}
            {task.status === 1 && (
              <>
                <Button
                  size='icon'
                  variant='ghost'
                  className='h-7 w-7 text-gray-400 hover:text-red-500'
                  onClick={() => onUpdateStatus(task.id, 0)}
                >
                  <XCircle size={16} />
                </Button>
                <Button
                  size='icon'
                  variant='ghost'
                  className='h-7 w-7 text-blue-500 hover:bg-blue-50'
                  onClick={() => onUpdateStatus(task.id, 2)}
                >
                  <PlayCircle size={16} />
                </Button>
              </>
            )}
            {/* 进行中 (2) -> 暂停 / 完成 */}
            {task.status === 2 && (
              <>
                <Button
                  size='icon'
                  variant='ghost'
                  className='h-7 w-7 text-yellow-500 hover:bg-yellow-50'
                  onClick={() => onUpdateStatus(task.id, 3)}
                >
                  <PauseCircle size={16} />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-7 w-7 text-green-500 hover:bg-green-50'
                    >
                      <CheckCircle size={16} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-60 p-3'>
                    <div className='mb-2 text-sm font-semibold'>完成并自评</div>
                    <div className='flex gap-2'>
                      <Input
                        type='number'
                        placeholder='0-100分'
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        className='h-8'
                      />
                      <Button
                        size='sm'
                        onClick={() => {
                          if (score) onUpdateStatus(task.id, 4, Number(score))
                        }}
                      >
                        提交
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
            {/* 暂停 (3) -> 废弃 / 继续 */}
            {task.status === 3 && (
              <>
                <Button
                  size='icon'
                  variant='ghost'
                  className='h-7 w-7 text-gray-400 hover:text-red-500'
                  onClick={() => onUpdateStatus(task.id, -1)}
                >
                  <XCircle size={16} />
                </Button>
                <Button
                  size='icon'
                  variant='ghost'
                  className='h-7 w-7 text-blue-500 hover:bg-blue-50'
                  onClick={() => onUpdateStatus(task.id, 2)}
                >
                  <RotateCcw size={16} />
                </Button>
              </>
            )}
            {/* 已完成 (4) -> 撤回 */}
            {task.status === 4 && (
              <Button
                size='icon'
                variant='ghost'
                className='h-7 w-7 text-gray-400'
                onClick={() => onUpdateStatus(task.id, 6)}
              >
                <RotateCcw size={16} />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// 4. Strategy Panel (Mockup)
const StrategyPanel = ({ isAdmin, onAdd }: any) => {
  // 实际项目中这里需要一个递归树组件，这里简化展示
  const { data: strategyList } = useQuery({
    queryKey: ['strategy'],
    queryFn: async () =>
      (await ajax.get('/tacticTask/getTacticTaskTree')) as any[],
  })

  return (
    <div className='space-y-4'>
      {isAdmin && (
        <Button className='w-full' variant='outline' onClick={onAdd}>
          <PlusCircle className='mr-2 h-4 w-4' /> 新增 L1 战略
        </Button>
      )}

      {(!strategyList || strategyList.length === 0) && (
        <div className='flex flex-col items-center justify-center py-10 text-gray-400'>
          <AlertCircle size={32} className='mb-2' />
          <p>暂无战略规划</p>
        </div>
      )}

      <div className='space-y-4'>
        {strategyList?.map((l1: any) => (
          <div
            key={l1.taskId}
            className='overflow-hidden rounded-lg border border-purple-100'
          >
            <div className='flex items-center justify-between bg-purple-50 p-3'>
              <div className='flex items-center gap-2'>
                <Badge className='bg-purple-600'>L1</Badge>
                <span className='font-bold text-slate-700'>{l1.title}</span>
              </div>
              {isAdmin && (
                <Button variant='ghost' size='icon' className='h-6 w-6'>
                  <Edit size={12} />
                </Button>
              )}
            </div>
            {l1.childrenTacticTasks?.length > 0 && (
              <div className='space-y-2 bg-white p-3'>
                {l1.childrenTacticTasks.map((l2: any) => (
                  <div
                    key={l2.taskId}
                    className='ml-2 border-l-2 border-orange-200 pl-4'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Badge
                          variant='outline'
                          className='border-orange-200 text-orange-600'
                        >
                          L2
                        </Badge>
                        <span className='text-sm text-slate-600'>
                          {l2.title}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// 5. Todo Panel (Simple text storage)
const TodoPanel = () => {
  const [content, setContent] = useState('')
  const { data } = useQuery({
    queryKey: ['userTreat'],
    queryFn: async () => {
      const res: any = await ajax.get('/tacticTask/getUserTreat')
      if (res) setContent(res.treatContent)
      return res
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () =>
      ajax.post('/tacticTask/save/userTreat', {
        treatContent: content,
        treatId: data?.treatId,
      }),
    onSuccess: () => toast.success('保存成功'),
  })

  return (
    <div className='flex h-full flex-col gap-2'>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className='flex-1 resize-none bg-slate-50'
        placeholder='记录待办事项...'
      />
      <div className='flex justify-end'>
        <Button
          size='sm'
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending && (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          )}{' '}
          保存
        </Button>
      </div>
    </div>
  )
}

// 6. Approval List (Simplified)
const ApprovalList = () => {
  const { data } = useQuery({
    queryKey: ['approvals'],
    queryFn: async () => {
      const res: any = await ajax.get('/tacticTask/getCheckTasks', {
        params: { pageNum: 1 },
      })
      return res?.list || []
    },
  })

  return (
    <div className='space-y-3'>
      {data?.map((item: any) => (
        <div
          key={item.taskId}
          className='flex items-center justify-between rounded border border-slate-100 bg-white p-3 shadow-sm'
        >
          <div>
            <div className='mb-1 flex items-center gap-2'>
              <div className='flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white'>
                {item.createBy?.[0]}
              </div>
              <span className='text-sm font-bold'>{item.createBy}</span>
            </div>
            <div className='max-w-[150px] truncate text-sm text-slate-600'>
              {item.title}
            </div>
          </div>
          <Button size='sm'>审批</Button>
        </div>
      ))}
      {!data?.length && (
        <div className='mt-10 text-center text-sm text-gray-400'>
          暂无待审批任务
        </div>
      )}
    </div>
  )
}
