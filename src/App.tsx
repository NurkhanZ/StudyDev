import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Container,
  Database,
  GitBranch,
  HelpCircle,
  LayoutList,
  Mic,
  Play,
  RotateCcw,
  Share2,
  Terminal,
  Volume2,
  VolumeX,
  Zap,
  BrainCircuit,
  Check,
  AlertCircle,
  Wrench,
  ArrowRight,
  Copy,
  Lightbulb,
  AlertTriangle,
  List,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  MODULES,
  VACANCY_ITEMS,
  SQUEEZE_CARDS,
  QUIZ_QUESTIONS,
  WAR_ROOM_INCIDENTS,
  GRILL_PROMPTS,
} from './data/knowledgeBase';
import { ModuleId, UserProgress } from './types';
import { sound } from './utils/sound';

type AppTab = 'dashboard' | 'theory' | 'quiz' | 'cases' | 'interview';

const STORAGE_KEY = 'studydev_arena_progress_v1';

const DEFAULT_PROGRESS: UserProgress = {
  xp: 0,
  streak: 0,
  maxStreak: 0,
  masteredCardIds: [],
  reviewCardIds: [],
  correctQuizIds: [],
  quarantineQuizIds: [],
  solvedIncidentIds: [],
  completedGrillIds: {},
  checkedVacancyIds: [],
  soundEnabled: true,
};

function getModuleIcon(iconName: string, className = 'w-5 h-5') {
  switch (iconName) {
    case 'Code2':
      return <Code2 className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'BrainCircuit':
      return <BrainCircuit className={className} />;
    case 'Database':
      return <Database className={className} />;
    case 'Container':
      return <Container className={className} />;
    case 'GitBranch':
      return <GitBranch className={className} />;
    case 'Terminal':
      return <Terminal className={className} />;
    default:
      return <BookOpen className={className} />;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [selectedModule, setSelectedModule] = useState<ModuleId | 'all'>('all');

  const [progress, setProgress] = useState<UserProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_PROGRESS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_PROGRESS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore
    }
  }, [progress]);

  // --- ТЕОРИЯ STATE ---
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);
  const [hideInterviewAnswers, setHideInterviewAnswers] = useState(false);

  const handleCopyCode = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeKey(key);
    setTimeout(() => setCopiedCodeKey(null), 2000);
  };

  // --- ТЕСТЫ STATE ---
  const [quizMode, setQuizMode] = useState<'calm' | 'timed' | 'mistakes'>('calm');
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(35);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // --- РАБОЧИЕ КЕЙСЫ STATE ---
  const [activeIncidentId, setActiveIncidentId] = useState<string>(WAR_ROOM_INCIDENTS[0].id);
  const [executedCmds, setExecutedCmds] = useState<Record<string, string[]>>({});
  const [selectedFixId, setSelectedFixId] = useState<Record<string, string>>({});

  // --- ВОПРОСЫ ИНТЕРВЬЮ STATE ---
  const [activeGrillId, setActiveGrillId] = useState<string>(GRILL_PROMPTS[0].id);
  const [userDraftAnswer, setUserDraftAnswer] = useState<Record<string, string>>({});
  const [revealedRubric, setRevealedRubric] = useState<Record<string, boolean>>({});
  const [checkedFlags, setCheckedFlags] = useState<Record<string, number[]>>({});

  // Отфильтрованные списки
  const filteredCards = useMemo(() => {
    if (selectedModule === 'all') return SQUEEZE_CARDS;
    return SQUEEZE_CARDS.filter((c) => c.moduleId === selectedModule);
  }, [selectedModule]);

  const filteredQuestions = useMemo(() => {
    let list = QUIZ_QUESTIONS;
    if (quizMode === 'mistakes') {
      list = list.filter((q) => progress.quarantineQuizIds.includes(q.id));
    } else if (selectedModule !== 'all') {
      list = list.filter((q) => q.moduleId === selectedModule);
    }
    return list;
  }, [selectedModule, quizMode, progress.quarantineQuizIds]);

  const currentQuestion = filteredQuestions[quizIndex] || filteredQuestions[0];

  // Таймер для режима на время
  useEffect(() => {
    if (activeTab !== 'quiz' || !timerActive || selectedOptionId || quizMode !== 'timed') {
      return;
    }
    if (timeLeft <= 0) {
      sound.playError(progress.soundEnabled);
      setSelectedOptionId('TIMEOUT');
      setProgress((prev) => ({
        ...prev,
        streak: 0,
        quarantineQuizIds: currentQuestion
          ? Array.from(new Set([...prev.quarantineQuizIds, currentQuestion.id]))
          : prev.quarantineQuizIds,
      }));
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [activeTab, timerActive, timeLeft, selectedOptionId, quizMode, currentQuestion, progress.soundEnabled]);

  // Прогресс по каждому из 7 модулей
  const moduleMastery = useMemo(() => {
    const map: Record<ModuleId, number> = {
      'python-oop': 0,
      'fastapi-async': 0,
      'ml-systems': 0,
      postgresql: 0,
      'docker-k8s': 0,
      'cicd-git': 0,
      'testing-linux': 0,
    };

    MODULES.forEach((m) => {
      const cards = SQUEEZE_CARDS.filter((c) => c.moduleId === m.id);
      const qs = QUIZ_QUESTIONS.filter((q) => q.moduleId === m.id);
      const incs = WAR_ROOM_INCIDENTS.filter((i) => i.moduleId === m.id);
      const grills = GRILL_PROMPTS.filter((g) => g.moduleId === m.id);

      const total = cards.length + qs.length + incs.length + grills.length;
      if (total === 0) return;

      const doneCards = cards.filter((c) => progress.masteredCardIds.includes(c.id)).length;
      const doneQs = qs.filter((q) => progress.correctQuizIds.includes(q.id)).length;
      const doneIncs = incs.filter((i) => progress.solvedIncidentIds.includes(i.id)).length;
      const doneGrills = grills.filter((g) => (progress.completedGrillIds[g.id] || 0) >= 2).length;

      map[m.id] = Math.round(((doneCards + doneQs + doneIncs + doneGrills) / total) * 100);
    });
    return map;
  }, [progress]);

  const overallReadiness = useMemo(() => {
    const vals = Object.values(moduleMastery);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [moduleMastery]);

  // Обработчики действий
  const toggleSound = () => {
    setProgress((p) => ({ ...p, soundEnabled: !p.soundEnabled }));
  };

  const handleMasterCard = (cardId: string) => {
    sound.playSuccess(progress.soundEnabled);
    setProgress((prev) => {
      const already = prev.masteredCardIds.includes(cardId);
      return {
        ...prev,
        xp: already ? prev.xp : prev.xp + 30,
        masteredCardIds: already
          ? prev.masteredCardIds.filter((id) => id !== cardId)
          : [...prev.masteredCardIds, cardId],
      };
    });
  };

  const handleSelectQuizOption = (optionId: string) => {
    if (!currentQuestion || selectedOptionId) return;
    setSelectedOptionId(optionId);
    const isCorrect = optionId === currentQuestion.correctOptionId;

    if (isCorrect) {
      sound.playSuccess(progress.soundEnabled);
      setProgress((prev) => ({
        ...prev,
        xp: prev.xp + 25,
        streak: prev.streak + 1,
        maxStreak: Math.max(prev.maxStreak, prev.streak + 1),
        correctQuizIds: Array.from(new Set([...prev.correctQuizIds, currentQuestion.id])),
        quarantineQuizIds: prev.quarantineQuizIds.filter((id) => id !== currentQuestion.id),
      }));
    } else {
      sound.playError(progress.soundEnabled);
      setProgress((prev) => ({
        ...prev,
        streak: 0,
        quarantineQuizIds: Array.from(new Set([...prev.quarantineQuizIds, currentQuestion.id])),
      }));
    }
  };

  const handleNextQuestion = () => {
    sound.playClick(progress.soundEnabled);
    setSelectedOptionId(null);
    setTimeLeft(35);
    setTimerActive(quizMode === 'timed');
    setQuizIndex((prev) => (prev + 1 < filteredQuestions.length ? prev + 1 : 0));
  };

  const handleRunDiagnosticCmd = (incidentId: string, cmd: string) => {
    sound.playClick(progress.soundEnabled);
    setExecutedCmds((prev) => {
      const existing = prev[incidentId] || [];
      if (existing.includes(cmd)) return prev;
      return { ...prev, [incidentId]: [...existing, cmd] };
    });
  };

  const handleSelectIncidentFix = (
    incident: (typeof WAR_ROOM_INCIDENTS)[0],
    fixId: string,
    isCorrect: boolean
  ) => {
    setSelectedFixId((prev) => ({ ...prev, [incident.id]: fixId }));
    if (isCorrect) {
      sound.playSuccess(progress.soundEnabled);
      setProgress((prev) => {
        const already = prev.solvedIncidentIds.includes(incident.id);
        return {
          ...prev,
          xp: already ? prev.xp : prev.xp + 50,
          solvedIncidentIds: already ? prev.solvedIncidentIds : [...prev.solvedIncidentIds, incident.id],
        };
      });
    } else {
      sound.playError(progress.soundEnabled);
    }
  };

  const handleToggleGrillFlag = (grillId: string, flagIdx: number) => {
    sound.playClick(progress.soundEnabled);
    setCheckedFlags((prev) => {
      const current = prev[grillId] || [];
      const next = current.includes(flagIdx)
        ? current.filter((i) => i !== flagIdx)
        : [...current, flagIdx];

      setProgress((p) => {
        const prevBest = p.completedGrillIds[grillId] || 0;
        const gained = next.length > prevBest ? (next.length - prevBest) * 20 : 0;
        return {
          ...p,
          xp: p.xp + gained,
          completedGrillIds: {
            ...p.completedGrillIds,
            [grillId]: Math.max(prevBest, next.length),
          },
        };
      });
      return { ...prev, [grillId]: next };
    });
  };

  const handleShareProgress = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(
      `Подготовка к собеседованию ML / AI Инженер (Python): мой прогресс ${overallReadiness}%. Попробуй пройти тесты: ${url}`
    );
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col w-full max-w-full overflow-x-hidden">
      {/* ШАПКА САЙТА (В стиле Яндекс Практикум / Roadmap.sh) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Логотип и понятное название */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              ML
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base text-slate-900 leading-tight truncate">
                Подготовка к интервью: ML / AI Инженер
              </div>
              <div className="text-xs text-slate-500 truncate">
                Учебник, тесты и практические кейсы по требованиям вакансии
              </div>
            </div>
          </div>

          {/* Правая панель: Прогресс, Ошибки, Хостинг, Звук */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
              <span>Изучено:</span>
              <span className="text-blue-600 font-bold">{overallReadiness}%</span>
            </div>

            {progress.quarantineQuizIds.length > 0 && (
              <button
                onClick={() => {
                  setQuizMode('mistakes');
                  setQuizIndex(0);
                  setSelectedOptionId(null);
                  setActiveTab('quiz');
                }}
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Повторить ошибки ({progress.quarantineQuizIds.length})</span>
              </button>
            )}

            <button
              onClick={toggleSound}
              className="p-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition cursor-pointer"
              title={progress.soundEnabled ? 'Звук включен' : 'Звук выключен'}
            >
              {progress.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-blue-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* ГЛАВНОЕ МЕНЮ НАВИГАЦИИ (Понятные разделы для первого посетителя) */}
        <div className="border-t border-slate-100 bg-slate-50/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center gap-1.5 py-2">
            {[
              {
                id: 'dashboard',
                label: 'План подготовки',
                icon: <LayoutList className="w-4 h-4" />,
                count: '7 модулей',
              },
              {
                id: 'theory',
                label: '1. Теория и понятия',
                icon: <BookOpen className="w-4 h-4" />,
                count: `${progress.masteredCardIds.length}/${SQUEEZE_CARDS.length}`,
              },
              {
                id: 'quiz',
                label: '2. Тесты',
                icon: <HelpCircle className="w-4 h-4" />,
                count: `${progress.correctQuizIds.length}/${QUIZ_QUESTIONS.length}`,
              },
              {
                id: 'cases',
                label: '3. Рабочие кейсы',
                icon: <Wrench className="w-4 h-4" />,
                count: `${progress.solvedIncidentIds.length}/${WAR_ROOM_INCIDENTS.length}`,
              },
              {
                id: 'interview',
                label: '4. Вопросы интервью',
                icon: <Mic className="w-4 h-4" />,
                count: `${Object.keys(progress.completedGrillIds).length}/${GRILL_PROMPTS.length}`,
              },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    sound.playClick(progress.soundEnabled);
                    setActiveTab(tab.id as AppTab);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200/70 bg-white border border-slate-200/80'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                      active ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ПАНЕЛЬ ВЫБОРА МОДУЛЯ (Показывается в разделах Теории и Тестов) */}
      {(activeTab === 'theory' || activeTab === 'quiz') && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Фильтр по теме:</span>
            <button
              onClick={() => {
                setSelectedModule('all');
                setActiveCardIndex(0);
                setQuizIndex(0);
                setSelectedOptionId(null);
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                selectedModule === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Все темы (7 модулей)
            </button>
            {MODULES.map((m, idx) => {
              const active = selectedModule === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    sound.playClick(progress.soundEnabled);
                    setSelectedModule(m.id);
                    setActiveCardIndex(0);
                    setQuizIndex(0);
                    setSelectedOptionId(null);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>
                    {idx + 1}. {m.shortTitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 min-w-0">
        {/* =================================================================== */}
        {/* ВКЛАДКА 0: ПЛАН ПОДГОТОВКИ (ДЛЯ ПЕРВОГО ПОСЕТИТЕЛЯ)                 */}
        {/* =================================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 min-w-0">
            {/* Приветственный блок: объясняет, что это за сайт и как по нему учиться */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-8 space-y-4 min-w-0">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                    Пошаговый курс подготовки по требованиям вакансии ML / AI Инженер
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                    Всё, что нужно знать для собеседования — в одном месте и простым языком
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Вместо чтения сотен разрозненных статей здесь собрана вся программа подготовки по 7 темам вакансии: от базовых понятий (что такое ООП, GIL, Индексы в PostgreSQL, Образы в Docker и Поды в Kubernetes) до реальных примеров из IT-компаний Казахстана и разбора вопросов собеседования.
                  </p>

                  {/* 4 понятных шага обучения */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('theory')}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-left transition cursor-pointer shadow-xs"
                    >
                      <BookOpen className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-sm">Шаг 1. Изучить теорию с нуля</div>
                        <div className="text-xs text-blue-100 mt-0.5">
                          Понятный разбор всех базовых терминов и примеры кода
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('quiz')}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 text-left transition cursor-pointer"
                    >
                      <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-sm">Шаг 2. Проверить себя в тестах</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          15 вопросов с выбором ответа и подробным объяснением
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Карточка общей статистики */}
                <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase">
                        Общий прогресс курса
                      </div>
                      <div className="text-3xl font-extrabold text-slate-900 mt-0.5">
                        {overallReadiness}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Баллы опыта</div>
                      <div className="text-lg font-bold text-blue-600">{progress.xp} XP</div>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${overallReadiness}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="text-slate-500">Темы учебника</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {progress.masteredCardIds.length} из {SQUEEZE_CARDS.length}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="text-slate-500">Тесты решены</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {progress.correctQuizIds.length} из {QUIZ_QUESTIONS.length}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="text-slate-500">Рабочие кейсы</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {progress.solvedIncidentIds.length} из {WAR_ROOM_INCIDENTS.length}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="text-slate-500">Устные вопросы</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {Object.keys(progress.completedGrillIds).length} из {GRILL_PROMPTS.length}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <button
                      onClick={handleShareProgress}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                    >
                      {copiedShare ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span>{copiedShare ? 'Ссылка скопирована' : 'Поделиться с другом'}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Сбросить весь сохраненный прогресс?')) {
                          setProgress(DEFAULT_PROGRESS);
                        }
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Сбросить</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ПРОГРАММА КУРСА ПО 7 МОДУЛЯМ ВАКАНСИИ */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Программа подготовки (7 модулей по требованиям вакансии)
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Выберите любой модуль, чтобы прочитать объяснение базовых понятий или сразу перейти к тестовым вопросам.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MODULES.map((m, idx) => {
                  const pct = moduleMastery[m.id];
                  const moduleCards = SQUEEZE_CARDS.filter((c) => c.moduleId === m.id);
                  return (
                    <div
                      key={m.id}
                      className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 shadow-xs transition flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {getModuleIcon(m.iconName, 'w-3.5 h-3.5')}
                            <span>Модуль {idx + 1}</span>
                          </span>
                          <span className="text-xs font-bold text-slate-600">
                            Готовность: {pct}%
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-slate-900 leading-snug">
                          {m.title}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">{m.subtitle}</p>

                        {/* Список уроков внутри модуля */}
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-400 uppercase">
                            Темы внутри модуля:
                          </div>
                          {moduleCards.map((c) => {
                            const done = progress.masteredCardIds.includes(c.id);
                            return (
                              <div
                                key={c.id}
                                className="text-xs text-slate-700 flex items-start gap-1.5"
                              >
                                <CheckCircle2
                                  className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                    done ? 'text-emerald-600' : 'text-slate-300'
                                  }`}
                                />
                                <span className="line-clamp-1">{c.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 space-y-3">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedModule(m.id);
                              setActiveCardIndex(0);
                              setActiveTab('theory');
                            }}
                            className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold text-center transition cursor-pointer"
                          >
                            Читать теорию
                          </button>
                          <button
                            onClick={() => {
                              setSelectedModule(m.id);
                              setQuizIndex(0);
                              setSelectedOptionId(null);
                              setActiveTab('quiz');
                            }}
                            className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
                          >
                            Тест
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ЧЕК-ЛИСТ ТРЕБОВАНИЙ ИЗ ОПИСАНИЯ ВАКАНСИИ */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Соответствие пунктам вашей вакансии (`vacancy.md`)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Здесь показана каждая строчка из документа вакансии и то, какой главный практический навык за ней стоит.
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Отмечено готовым: {progress.checkedVacancyIds.length} из {VACANCY_ITEMS.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {VACANCY_ITEMS.map((item) => {
                  const isChecked = progress.checkedVacancyIds.includes(item.id);
                  const mod = MODULES.find((m) => m.id === item.moduleId);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            sound.playClick(progress.soundEnabled);
                            setProgress((prev) => ({
                              ...prev,
                              checkedVacancyIds: isChecked
                                ? prev.checkedVacancyIds.filter((id) => id !== item.id)
                                : [...prev.checkedVacancyIds, item.id],
                            }));
                          }}
                          className="mt-1 w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                              {item.category}
                            </span>
                            {mod && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {mod.shortTitle}
                              </span>
                            )}
                          </div>
                          <div
                            className={`font-bold text-sm mt-1 ${
                              isChecked ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {item.text}
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            <strong className="text-slate-800">Что важно знать на интервью:</strong>{' '}
                            {item.practitionerSummary}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedModule(item.moduleId);
                          setActiveCardIndex(0);
                          setActiveTab('theory');
                        }}
                        className="self-end sm:self-center px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 whitespace-nowrap transition cursor-pointer shrink-0"
                      >
                        Открыть тему →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ВКЛАДКА 1: УЧЕБНИК — ТЕОРИЯ И ПОНЯТИЯ (СТИЛЬ ЯНДЕКС ПРАКТИКУМ / GITBOOK / HABR) */}
        {/* =================================================================== */}
        {activeTab === 'theory' && (
          <div className="flex flex-col lg:flex-row gap-8 items-start min-w-0">
            {/* Левая панель оглавления учебника (фиксируется при прокрутке на десктопе) */}
            <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs min-w-0">
              <div className="pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Содержание учебника</span>
                  <span className="text-blue-600">
                    {progress.masteredCardIds.length} / {SQUEEZE_CARDS.length} глав
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{
                      width: `${Math.round(
                        (progress.masteredCardIds.length / Math.max(1, SQUEEZE_CARDS.length)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <nav className="space-y-4">
                {(selectedModule === 'all'
                  ? MODULES
                  : MODULES.filter((m) => m.id === selectedModule)
                ).map((mod) => {
                  const modCards = filteredCards
                    .map((card, globalIdx) => ({ card, globalIdx }))
                    .filter((item) => item.card.moduleId === mod.id);
                  if (modCards.length === 0) return null;
                  const modNum = MODULES.findIndex((m) => m.id === mod.id) + 1;

                  return (
                    <div key={mod.id} className="space-y-1">
                      <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <span>
                          {modNum}. {mod.shortTitle}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {modCards.map(({ card, globalIdx }) => {
                          const isSelected = globalIdx === activeCardIndex;
                          const isMastered = progress.masteredCardIds.includes(card.id);
                          return (
                            <button
                              key={card.id}
                              onClick={() => {
                                sound.playClick(progress.soundEnabled);
                                setActiveCardIndex(globalIdx);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition cursor-pointer flex items-start justify-between gap-2 border-l-2 ${
                                isSelected
                                  ? 'bg-blue-50/80 border-blue-600 text-blue-800 font-semibold'
                                  : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                              }`}
                            >
                              <div className="min-w-0 leading-snug">
                                <div className="break-words">{card.title}</div>
                                {card.readingTime && (
                                  <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                                    {card.readingTime}
                                  </div>
                                )}
                              </div>
                              {isMastered && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </nav>
            </aside>

            {/* Правая колонка: Чистая типографическая статья в духе Яндекс Практикум / Habr / GitBook */}
            <div className="flex-1 min-w-0 w-full">
              {filteredCards[activeCardIndex] ? (
                (() => {
                  const card = filteredCards[activeCardIndex];
                  const isMastered = progress.masteredCardIds.includes(card.id);
                  const mod = MODULES.find((m) => m.id === card.moduleId);
                  const modNumber = MODULES.findIndex((m) => m.id === card.moduleId) + 1;
                  const prevCard = activeCardIndex > 0 ? filteredCards[activeCardIndex - 1] : null;
                  const nextCard =
                    activeCardIndex < filteredCards.length - 1
                      ? filteredCards[activeCardIndex + 1]
                      : null;

                  const allInterviewQAs = [
                    card.interviewerTrap,
                    ...(card.extraInterviewQuestions || []),
                  ];

                  const tocItems: { id: string; label: string }[] = [
                    { id: 'sec-intro', label: 'Введение и суть' },
                    { id: 'sec-entities', label: `Базовые понятия (${card.basicEntities.length})` },
                    ...(card.deepDiveSections && card.deepDiveSections.length > 0
                      ? [{ id: 'sec-deep', label: 'Глубокий разбор теории' }]
                      : []),
                    ...(card.comparisonTable
                      ? [{ id: 'sec-table', label: 'Сравнительная таблица' }]
                      : []),
                    { id: 'sec-workflow', label: 'Как это работает и шаги в работе' },
                    ...(card.productionPitfalls && card.productionPitfalls.length > 0
                      ? [{ id: 'sec-pitfalls', label: 'Грабли и костыли в проде' }]
                      : []),
                    { id: 'sec-kz', label: 'Опыт в РК и Best Practices' },
                    ...(card.codeSnippet || card.secondCodeSnippet
                      ? [{ id: 'sec-code', label: 'Примеры боевого кода' }]
                      : []),
                    { id: 'sec-interview', label: `Вопросы собеседования (${allInterviewQAs.length})` },
                  ];

                  const scrollToSection = (id: string) => {
                    const el = document.getElementById(id);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  };

                  return (
                    <article className="bg-white border border-slate-200/90 rounded-2xl shadow-xs px-5 py-7 sm:px-10 sm:py-10 lg:px-12 lg:py-11 min-w-0">
                      <div className="max-w-[760px] mx-auto min-w-0">
                        {/* Хлебные крошки, время чтения и статус */}
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 mb-5">
                          <div className="flex flex-wrap items-center gap-2">
                            {mod && (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                                {getModuleIcon(mod.iconName, 'w-3.5 h-3.5')}
                                <span>
                                  Модуль {modNumber} · {mod.shortTitle}
                                </span>
                              </span>
                            )}
                            {card.readingTime && (
                              <span className="inline-flex items-center gap-1 text-slate-500 font-medium px-2 py-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{card.readingTime}</span>
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleMasterCard(card.id)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              isMastered
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isMastered ? 'Глава изучена' : 'Отметить изученной'}</span>
                          </button>
                        </div>

                        {/* Заголовок статьи */}
                        <header className="pb-7 border-b border-slate-200/80">
                          <h1 className="text-2xl sm:text-[32px] font-extrabold text-slate-900 leading-[1.22] tracking-tight break-words">
                            {card.title}
                          </h1>
                          <p className="mt-3 text-base sm:text-[17px] text-slate-500 leading-relaxed">
                            {card.subtitle}
                          </p>
                        </header>

                        {/* Быстрое оглавление главы (On this page) */}
                        <div className="my-7 p-4 sm:p-5 rounded-xl bg-slate-50/90 border border-slate-200/80">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                            <List className="w-3.5 h-3.5 text-blue-600" />
                            <span>В этой главе</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {tocItems.map((item, idx) => (
                              <button
                                key={item.id}
                                onClick={() => scrollToSection(item.id)}
                                className="text-[13px] font-medium text-slate-700 hover:text-blue-600 transition cursor-pointer flex items-center gap-1.5"
                              >
                                <span className="text-slate-400 text-xs">{idx + 1}.</span>
                                <span className="underline decoration-slate-300 hover:decoration-blue-500 underline-offset-4">
                                  {item.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ОСНОВНОЙ ТЕКСТ УЧЕБНИКА */}
                        <div className="space-y-12 text-[15.5px] sm:text-[16.5px] leading-[1.78] text-slate-700">
                          {/* 1. ВВЕДЕНИЕ */}
                          <section id="sec-intro" className="scroll-mt-32">
                            <div className="border-l-4 border-blue-600 bg-blue-50/40 pl-5 pr-4 py-4 rounded-r-xl">
                              <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1.5">
                                Главная идея простыми словами
                              </div>
                              <p className="text-slate-800 leading-[1.75]">{card.whatItIs}</p>
                            </div>
                          </section>

                          {/* 2. БАЗОВЫЕ ПОНЯТИЯ И СУЩНОСТИ (ЧИСТЫЙ СЛОВАРЬ БЕЗ КОРОБОК В КОРОБКАХ) */}
                          <section id="sec-entities" className="scroll-mt-32 space-y-5">
                            <div className="border-b border-slate-200/80 pb-2.5">
                              <h2 className="text-xl sm:text-[23px] font-bold text-slate-900 tracking-tight">
                                Базовые понятия и сущности (с нуля)
                              </h2>
                              <p className="text-sm text-slate-500 mt-1">
                                Четкие определения каждого термина, на котором строится эта тема.
                              </p>
                            </div>

                            <div className="divide-y divide-slate-100">
                              {card.basicEntities.map((ent, idx) => (
                                <div key={idx} className="py-5 first:pt-1 last:pb-0 space-y-2.5">
                                  <h3 className="text-[17px] sm:text-[18px] font-bold text-slate-900 flex items-baseline gap-2.5">
                                    <span className="text-blue-600 font-extrabold text-sm">
                                      {String(idx + 1).padStart(2, '0')}
                                    </span>
                                    <span>{ent.name}</span>
                                  </h3>
                                  <p className="text-slate-700">{ent.whatItIs}</p>
                                  <div className="border-l-2 border-emerald-500 pl-3.5 py-0.5 text-[14.5px] sm:text-[15px] text-slate-600">
                                    <span className="font-semibold text-emerald-800">
                                      Зачем на практике:{' '}
                                    </span>
                                    {ent.whyWeNeedIt}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>

                          {/* 3. ГЛУБОКИЙ РАЗБОР ТЕОРИИ (ЛОНГРИД-СЕКЦИИ) */}
                          {card.deepDiveSections && card.deepDiveSections.length > 0 && (
                            <section id="sec-deep" className="scroll-mt-32 space-y-8">
                              <div className="border-b border-slate-200/80 pb-2.5">
                                <h2 className="text-xl sm:text-[23px] font-bold text-slate-900 tracking-tight">
                                  Глубокий разбор теории и архитектуры
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                  Детальное объяснение того, как технология ведет себя под нагрузкой и почему в индустрии принято делать именно так.
                                </p>
                              </div>

                              <div className="space-y-9">
                                {card.deepDiveSections.map((sec, idx) => (
                                  <div key={idx} className="space-y-4">
                                    <h3 className="text-[18px] sm:text-[20px] font-bold text-slate-900 leading-snug">
                                      {sec.title}
                                    </h3>
                                    {sec.paragraphs.map((p, pIdx) => (
                                      <p key={pIdx} className="text-slate-700">
                                        {p}
                                      </p>
                                    ))}
                                    {sec.keyRule && (
                                      <div className="border-l-4 border-indigo-600 bg-indigo-50/50 pl-5 pr-4 py-3.5 rounded-r-xl flex items-start gap-3">
                                        <Lightbulb className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                                        <div className="text-[15px] text-slate-800 leading-relaxed">
                                          <span className="font-bold text-indigo-900">
                                            Запомните:{' '}
                                          </span>
                                          {sec.keyRule}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {/* 4. СРАВНИТЕЛЬНАЯ ТАБЛИЦА */}
                          {card.comparisonTable && (
                            <section id="sec-table" className="scroll-mt-32 space-y-4">
                              <div className="border-b border-slate-200/80 pb-2.5">
                                <h2 className="text-xl sm:text-[23px] font-bold text-slate-900 tracking-tight">
                                  {card.comparisonTable.title}
                                </h2>
                              </div>

                              <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left border-collapse text-[14px] sm:text-[14.5px] leading-relaxed">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-800">
                                      {card.comparisonTable.headers.map((header, hIdx) => (
                                        <th
                                          key={hIdx}
                                          className="px-4 py-3.5 font-bold text-xs uppercase tracking-wider text-slate-600"
                                        >
                                          {header}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {card.comparisonTable.rows.map((row, rIdx) => (
                                      <tr
                                        key={rIdx}
                                        className={rIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}
                                      >
                                        <td className="px-4 py-3.5 font-semibold text-slate-900 align-top">
                                          {row[0]}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-700 align-top">
                                          {row[1]}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-700 align-top">
                                          {row[2]}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </section>
                          )}

                          {/* 5. ПОШАГОВЫЙ ПРОЦЕСС И МЕХАНИКА ПОД КАПОТОМ */}
                          <section id="sec-workflow" className="scroll-mt-32 space-y-7">
                            <div className="border-b border-slate-200/80 pb-2.5">
                              <h2 className="text-xl sm:text-[23px] font-bold text-slate-900 tracking-tight">
                                Как мы используем это в работе (Пошагово и под капотом)
                              </h2>
                            </div>

                            <div className="space-y-3">
                              <h3 className="text-[17px] font-bold text-slate-900">
                                Пошаговый порядок действий инженера
                              </h3>
                              <ol className="space-y-3.5 pt-1">
                                {card.howWeUseItStepByStep.map((step, i) => (
                                  <li key={i} className="flex items-start gap-3.5">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                                      {i + 1}
                                    </span>
                                    <span className="text-slate-700">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            <div className="space-y-3 pt-2">
                              <h3 className="text-[17px] font-bold text-slate-900">
                                Что происходит под капотом
                              </h3>
                              <ul className="space-y-2.5 list-disc pl-5 marker:text-blue-500">
                                {card.howItWorks.map((item, i) => (
                                  <li key={i} className="pl-1 text-slate-700">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="space-y-3 pt-2">
                              <h3 className="text-[17px] font-bold text-slate-900">
                                Когда и почему выбирают этот подход
                              </h3>
                              <ul className="space-y-2.5 list-disc pl-5 marker:text-slate-400">
                                {card.whyAndWhen.map((item, i) => (
                                  <li key={i} className="pl-1 text-slate-700">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </section>

                          {/* 6. ГРАБЛИ В ПРОДЕ (КОСТЫЛИ НОВИЧКОВ VS КАК НАДО) */}
                          {card.productionPitfalls && card.productionPitfalls.length > 0 && (
                            <section id="sec-pitfalls" className="scroll-mt-32 space-y-5">
                              <div className="border-b border-slate-200/80 pb-2.5">
                                <h2 className="text-xl sm:text-[23px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                                  <span>Грабли в проде: частые ошибки и как делать правильно</span>
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                  Реальные баги и костыли, из-за которых сервисы падают после выкатки в прод.
                                </p>
                              </div>

                              <div className="space-y-6">
                                {card.productionPitfalls.map((pitfall, idx) => (
                                  <div
                                    key={idx}
                                    className="rounded-xl border border-slate-200 overflow-hidden"
                                  >
                                    <div className="bg-rose-50/70 border-b border-rose-100 px-5 py-3.5">
                                      <div className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-1">
                                        Ошибка #{idx + 1}
                                      </div>
                                      <div className="font-bold text-[15.5px] text-slate-900 leading-snug">
                                        {pitfall.mistake}
                                      </div>
                                    </div>
                                    <div className="px-5 py-4 space-y-3 bg-white text-[15px]">
                                      <div>
                                        <span className="font-semibold text-rose-800">
                                          Почему это положит прод:{' '}
                                        </span>
                                        <span className="text-slate-700">
                                          {pitfall.whyItFailsInProd}
                                        </span>
                                      </div>
                                      <div className="border-l-2 border-emerald-500 pl-3.5 py-0.5">
                                        <span className="font-semibold text-emerald-800">
                                          Как сделать правильно:{' '}
                                        </span>
                                        <span className="text-slate-800">{pitfall.properFix}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {/* 7. КОНТЕКСТ КОМПАНИЙ КАЗАХСТАНА И BEST PRACTICES */}
                          <section id="sec-kz" className="scroll-mt-32 space-y-6">
                            <div className="border-b border-slate-200/80 pb-2.5">
                              <h2 className="text-xl sm:text-[23px] font-bold text-slate-900 tracking-tight">
                                Практика в IT-компаниях Казахстана и Best Practices
                              </h2>
                            </div>

                            <div className="border-l-4 border-amber-500 bg-amber-50/45 pl-5 pr-4 py-4 rounded-r-xl space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                                  🇰🇿 Реальный контекст рынка РК
                                </span>
                                <span className="text-xs font-semibold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded">
                                  {card.kzContext.companies}
                                </span>
                              </div>
                              <p className="text-[15.5px] text-slate-800 leading-relaxed">
                                {card.kzContext.scenario}
                              </p>
                            </div>

                            <div className="space-y-3">
                              <h3 className="text-[17px] font-bold text-slate-900">
                                Чек-лист хороших практик (Best Practices)
                              </h3>
                              <ul className="space-y-2.5">
                                {card.bestPractices.map((bp, i) => (
                                  <li key={i} className="flex items-start gap-2.5 text-slate-700">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1.5" />
                                    <span>{bp}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </section>

                          {/* 8. БОЕВЫЕ ПРИМЕРЫ КОДА (С КНОПКОЙ КОПИРОВАНИЯ) */}
                          {(card.codeSnippet || card.secondCodeSnippet) && (
                            <section id="sec-code" className="scroll-mt-32 space-y-5 min-w-0">
                              <div className="border-b border-slate-200/80 pb-2.5">
                                <h2 className="text-xl sm:text-[23px] font-bold text-slate-900 tracking-tight">
                                  Примеры боевого кода
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                  Готовые шаблоны, которые можно показывать и обсуждать на техническом интервью.
                                </p>
                              </div>

                              {[card.codeSnippet, card.secondCodeSnippet]
                                .filter((s): s is { label: string; code: string } => Boolean(s))
                                .map((snippet, sIdx) => {
                                  const key = `${card.id}-code-${sIdx}`;
                                  const isCopied = copiedCodeKey === key;
                                  return (
                                    <div
                                      key={key}
                                      className="rounded-xl overflow-hidden border border-slate-800 bg-[#0f172a] min-w-0 max-w-full"
                                    >
                                      <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between gap-3">
                                        <span className="text-xs font-semibold text-slate-200 truncate">
                                          {snippet.label}
                                        </span>
                                        <button
                                          onClick={() => handleCopyCode(key, snippet.code)}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-700/80 hover:bg-slate-600 text-slate-200 text-[11px] font-medium transition cursor-pointer shrink-0"
                                        >
                                          {isCopied ? (
                                            <>
                                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                                              <span className="text-emerald-300">Скопировано</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3.5 h-3.5" />
                                              <span>Скопировать</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                      <pre className="p-4 sm:p-5 text-[13px] text-slate-100 overflow-x-auto max-w-full leading-[1.65]">
                                        <code>{snippet.code}</code>
                                      </pre>
                                    </div>
                                  );
                                })}
                            </section>
                          )}

                          {/* 9. РАЗБОР ВОПРОСОВ НА СОБЕСЕДОВАНИИ (ВСЕ ВОПРОСЫ ГЛАВЫ) */}
                          <section id="sec-interview" className="scroll-mt-32 space-y-6">
                            <div className="border-b border-slate-200/80 pb-2.5 flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h2 className="text-xl sm:text-[23px] font-bold text-slate-900 tracking-tight">
                                  Вопросы на собеседовании по этой главе ({allInterviewQAs.length})
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                  Сравните, как отвечает кандидат без прода и как отвечает инженер с реальным опытом.
                                </p>
                              </div>
                              <button
                                onClick={() => setHideInterviewAnswers((v) => !v)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer shrink-0"
                              >
                                {hideInterviewAnswers ? (
                                  <>
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Показать ответы</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5" />
                                    <span>Скрыть ответы (проверить себя)</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="space-y-8">
                              {allInterviewQAs.map((qa, qIdx) => (
                                <div key={qIdx} className="space-y-3.5">
                                  <div className="bg-slate-900 text-white rounded-xl px-5 py-4">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-1">
                                      Вопрос интервьюера #{qIdx + 1}
                                    </div>
                                    <div className="text-[15.5px] sm:text-[16.5px] font-semibold leading-snug">
                                      {qa.question}
                                    </div>
                                  </div>

                                  {hideInterviewAnswers ? (
                                    <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-sm text-slate-500 text-center">
                                      Попробуйте сначала сформулировать ответ вслух, а затем нажмите «Показать ответы» выше.
                                    </div>
                                  ) : (
                                    <div className="space-y-3 pl-1">
                                      <div className="border-l-4 border-rose-400 bg-rose-50/45 pl-4 pr-4 py-3 rounded-r-lg">
                                        <div className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-1">
                                          Поверхностный ответ новичка
                                        </div>
                                        <p className="text-[15px] text-slate-700 leading-relaxed">
                                          {qa.juniorAnswer}
                                        </p>
                                      </div>

                                      <div className="border-l-4 border-emerald-600 bg-emerald-50/50 pl-4 pr-4 py-3.5 rounded-r-lg">
                                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                                          Сильный ответ инженера с опытом
                                        </div>
                                        <p className="text-[15px] text-slate-800 leading-relaxed">
                                          {qa.practitionerAnswer}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </section>
                        </div>

                        {/* Нижняя панель завершения главы и навигации (стиль GitBook / Docusaurus) */}
                        <footer className="mt-12 pt-8 border-t border-slate-200 space-y-5">
                          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                            <div className="text-sm text-slate-700">
                              <span className="font-bold text-slate-900">Дочитали главу?</span>{' '}
                              Отметьте прогресс и закрепите материал тестом.
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => handleMasterCard(card.id)}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                                  isMastered
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{isMastered ? 'Глава изучена ✓' : 'Отметить прочитанной'}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedModule(card.moduleId);
                                  setQuizIndex(0);
                                  setSelectedOptionId(null);
                                  setActiveTab('quiz');
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                              >
                                <span>Пройти тест по модулю</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {prevCard ? (
                              <button
                                onClick={() => {
                                  setActiveCardIndex((i) => Math.max(0, i - 1));
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="text-left p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition cursor-pointer"
                              >
                                <div className="text-xs font-medium text-slate-400">
                                  ← Предыдущая глава
                                </div>
                                <div className="text-sm font-bold text-slate-800 mt-1 line-clamp-1">
                                  {prevCard.title}
                                </div>
                              </button>
                            ) : (
                              <div />
                            )}

                            {nextCard ? (
                              <button
                                onClick={() => {
                                  setActiveCardIndex((i) =>
                                    Math.min(filteredCards.length - 1, i + 1)
                                  );
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="text-right p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition cursor-pointer"
                              >
                                <div className="text-xs font-medium text-slate-400">
                                  Следующая глава →
                                </div>
                                <div className="text-sm font-bold text-blue-700 mt-1 line-clamp-1">
                                  {nextCard.title}
                                </div>
                              </button>
                            ) : (
                              <div />
                            )}
                          </div>
                        </footer>
                      </div>
                    </article>
                  );
                })()
              ) : (
                <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-slate-500">
                  Темы не найдены.
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ВКЛАДКА 2: ТЕСТЫ С ВЫБОРОМ ОТВЕТА И ПОДРОБНЫМ ОБЪЯСНЕНИЕМ           */}
        {/* =================================================================== */}
        {activeTab === 'quiz' && (
          <div className="max-w-3xl mx-auto space-y-5 min-w-0">
            {/* Панель настроек теста */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setQuizMode('calm');
                    setTimerActive(false);
                    setSelectedOptionId(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    quizMode === 'calm'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Обычный режим (без таймера)
                </button>
                <button
                  onClick={() => {
                    setQuizMode('timed');
                    setQuizIndex(0);
                    setSelectedOptionId(null);
                    setTimeLeft(35);
                    setTimerActive(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    quizMode === 'timed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Блиц на время (35 сек)
                </button>
                <button
                  onClick={() => {
                    setQuizMode('mistakes');
                    setQuizIndex(0);
                    setSelectedOptionId(null);
                    setTimerActive(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    quizMode === 'mistakes'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Вопросы с ошибками ({progress.quarantineQuizIds.length})
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs">
                {quizMode === 'timed' && (
                  <div
                    className={`flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg border ${
                      timeLeft <= 10
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>{timeLeft} сек</span>
                  </div>
                )}
                <span className="text-slate-500 font-semibold">
                  Вопрос {filteredQuestions.length ? quizIndex + 1 : 0} из{' '}
                  {filteredQuestions.length}
                </span>
              </div>
            </div>

            {currentQuestion ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    Тема: {currentQuestion.kzCompanyTag}
                  </span>
                  <span className="text-xs text-slate-500">
                    Выберите наиболее грамотный ответ
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {currentQuestion.question}
                </h2>

                <div className="space-y-3">
                  {currentQuestion.options.map((opt, idx) => {
                    const isAnswered = Boolean(selectedOptionId);
                    const isSelected = selectedOptionId === opt.id;
                    const isCorrect = opt.id === currentQuestion.correctOptionId;

                    let cardStyle =
                      'border-slate-200 hover:border-blue-400 bg-white hover:bg-slate-50/70';
                    if (isAnswered) {
                      if (isCorrect) {
                        cardStyle = 'border-emerald-500 bg-emerald-50/70';
                      } else if (isSelected) {
                        cardStyle = 'border-rose-400 bg-rose-50/70';
                      } else {
                        cardStyle = 'border-slate-200 bg-slate-50 opacity-65';
                      }
                    }

                    return (
                      <button
                        key={opt.id}
                        disabled={isAnswered}
                        onClick={() => handleSelectQuizOption(opt.id)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition flex flex-col gap-2.5 cursor-pointer ${cardStyle}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-slate-900 leading-relaxed">
                            {opt.text}
                          </span>
                        </div>

                        {isAnswered && (
                          <div className="pt-2 border-t border-slate-200/80 pl-9 space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                  isCorrect
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isCorrect ? '✓ Правильный ответ' : opt.tagLabel}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">{opt.feedback}</p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedOptionId && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-bold uppercase text-blue-700">
                        Главный вывод для запоминания:
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                        {currentQuestion.deepTakeaway}
                      </p>
                    </div>
                    <button
                      onClick={handleNextQuestion}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs whitespace-nowrap transition cursor-pointer shrink-0"
                    >
                      Следующий вопрос →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">
                  У вас нет вопросов с ошибками в этом разделе!
                </h3>
                <button
                  onClick={() => {
                    setQuizMode('calm');
                    setSelectedModule('all');
                    setQuizIndex(0);
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs cursor-pointer"
                >
                  Вернуться ко всем вопросам
                </button>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* ВКЛАДКА 3: ПРАКТИЧЕСКИЕ РАБОЧИЕ КЕЙСЫ (РАЗБОР СИТУАЦИЙ)             */}
        {/* =================================================================== */}
        {activeTab === 'cases' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
            {/* Список кейсов */}
            <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2 min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1 pb-1 border-b border-slate-100">
                Практические ситуации ({WAR_ROOM_INCIDENTS.length}):
              </div>
              {WAR_ROOM_INCIDENTS.map((inc, idx) => {
                const active = inc.id === activeIncidentId;
                const solved = progress.solvedIncidentIds.includes(inc.id);
                return (
                  <button
                    key={inc.id}
                    onClick={() => {
                      sound.playClick(progress.soundEnabled);
                      setActiveIncidentId(inc.id);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer flex items-start justify-between gap-2 ${
                      active
                        ? 'bg-blue-50 border-blue-500 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-blue-600">
                        Кейс #{idx + 1} • {inc.companyContext}
                      </div>
                      <div className="text-xs sm:text-sm font-bold mt-0.5 leading-snug break-words">
                        {inc.title}
                      </div>
                    </div>
                    {solved && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </aside>

            {/* Разбор выбранного кейса */}
            <div className="lg:col-span-8 min-w-0">
              {(() => {
                const inc =
                  WAR_ROOM_INCIDENTS.find((i) => i.id === activeIncidentId) ||
                  WAR_ROOM_INCIDENTS[0];
                const ranCmds = executedCmds[inc.id] || [];
                const chosenFix = selectedFixId[inc.id];

                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs min-w-0">
                    {/* Описание ситуации */}
                    <div className="p-4 sm:p-5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                      <div className="text-xs font-bold uppercase text-amber-800">
                        Рабочая ситуация • {inc.companyContext}
                      </div>
                      <h2 className="text-lg font-extrabold text-slate-900">{inc.title}</h2>
                      <p className="text-xs sm:text-sm text-slate-700 pt-1">{inc.alertBanner}</p>
                    </div>

                    {/* Логи сервера */}
                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 min-w-0 max-w-full">
                      <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs font-mono text-slate-300">
                        Журнал ошибок сервера (Логи):
                      </div>
                      <pre className="p-4 text-xs text-rose-300 font-mono overflow-x-auto max-w-full leading-relaxed">
                        {inc.initialLogs}
                      </pre>
                    </div>

                    {/* Шаг 1: Диагностические команды */}
                    <div className="space-y-3 min-w-0">
                      <div className="text-sm font-bold text-slate-900">
                        Шаг 1. Нажмите на команды ниже, чтобы проверить систему и найти причину поломки:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {inc.diagnosticCommands.map((dc) => {
                          const alreadyRan = ranCmds.includes(dc.cmd);
                          return (
                            <button
                              key={dc.cmd}
                              onClick={() => handleRunDiagnosticCmd(inc.id, dc.cmd)}
                              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono border transition cursor-pointer ${
                                alreadyRan
                                  ? 'bg-blue-50 border-blue-400 text-blue-900 font-semibold'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-100'
                              }`}
                            >
                              <Play className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="break-all text-left">$ {dc.cmd}</span>
                            </button>
                          );
                        })}
                      </div>

                      {inc.diagnosticCommands
                        .filter((dc) => ranCmds.includes(dc.cmd))
                        .map((dc) => (
                          <div
                            key={dc.cmd}
                            className="rounded-xl overflow-hidden border border-slate-300 bg-slate-900 min-w-0 max-w-full"
                          >
                            <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs font-mono text-blue-300">
                              $ {dc.cmd} — {dc.label}
                            </div>
                            <pre className="p-4 text-xs text-emerald-300 font-mono overflow-x-auto max-w-full">
                              {dc.output}
                            </pre>
                            <div className="px-4 py-3 bg-amber-50 border-t border-amber-200 text-xs text-slate-800">
                              <strong className="text-amber-900">Подсказка (Что это значит):</strong>{' '}
                              {dc.clue}
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Шаг 2: Выбор правильного решения */}
                    <div className="space-y-3 pt-4 border-t border-slate-200">
                      <div className="text-sm font-bold text-slate-900">
                        Шаг 2. {inc.question}
                      </div>
                      <div className="space-y-2.5">
                        {inc.fixes.map((fix) => {
                          const isChosen = chosenFix === fix.id;
                          return (
                            <div key={fix.id} className="space-y-2">
                              <button
                                onClick={() => handleSelectIncidentFix(inc, fix.id, fix.isCorrect)}
                                className={`w-full text-left p-4 rounded-xl border-2 transition cursor-pointer ${
                                  isChosen
                                    ? fix.isCorrect
                                      ? 'bg-emerald-50 border-emerald-500 text-slate-900'
                                      : 'bg-rose-50 border-rose-400 text-slate-900'
                                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                              >
                                <div className="text-xs sm:text-sm font-medium leading-relaxed">
                                  {fix.text}
                                </div>
                              </button>
                              {isChosen && (
                                <div
                                  className={`p-3.5 rounded-lg text-xs leading-relaxed ${
                                    fix.isCorrect
                                      ? 'bg-emerald-100/80 text-emerald-950 border border-emerald-300'
                                      : 'bg-rose-100/80 text-rose-950 border border-rose-300'
                                  }`}
                                >
                                  <strong>
                                    {fix.isCorrect ? '✓ Верное решение: ' : '✗ Почему это не поможет: '}
                                  </strong>
                                  {fix.explanation}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ВКЛАДКА 4: ТРЕНИРОВКА УСТНЫХ ОТВЕТОВ НА ВОПРОСЫ СОБЕСЕДОВАНИЯ       */}
        {/* =================================================================== */}
        {activeTab === 'interview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
            <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2 min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1 pb-1 border-b border-slate-100">
                Вопросы собеседования ({GRILL_PROMPTS.length}):
              </div>
              {GRILL_PROMPTS.map((gp, idx) => {
                const active = gp.id === activeGrillId;
                const score = progress.completedGrillIds[gp.id] || 0;
                const mod = MODULES.find((m) => m.id === gp.moduleId);
                return (
                  <button
                    key={gp.id}
                    onClick={() => {
                      sound.playClick(progress.soundEnabled);
                      setActiveGrillId(gp.id);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer flex items-start justify-between gap-2 ${
                      active
                        ? 'bg-blue-50 border-blue-500 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      {mod && (
                        <div className="text-[11px] font-semibold text-blue-600 mb-0.5">
                          Вопрос #{idx + 1} • {mod.shortTitle}
                        </div>
                      )}
                      <div className="text-xs font-bold line-clamp-2 break-words">
                        {gp.question}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 shrink-0">
                      {score}/{gp.greenFlags.length}
                    </span>
                  </button>
                );
              })}
            </aside>

            <div className="lg:col-span-8 min-w-0">
              {(() => {
                const gp =
                  GRILL_PROMPTS.find((g) => g.id === activeGrillId) || GRILL_PROMPTS[0];
                const isRevealed = Boolean(revealedRubric[gp.id]);
                const checked = checkedFlags[gp.id] || [];

                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs min-w-0">
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase text-blue-600">
                        Тренировка устного ответа своими словами
                      </span>
                      <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                        {gp.question}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600">
                        <strong>Что проверяет интервьюер этим вопросом:</strong>{' '}
                        {gp.whyInterviewerAsks}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-800">
                        Шаг 1. Попробуйте ответить вслух или запишите основные тезисы своего ответа:
                      </label>
                      <textarea
                        rows={4}
                        value={userDraftAnswer[gp.id] || ''}
                        onChange={(e) =>
                          setUserDraftAnswer((prev) => ({ ...prev, [gp.id]: e.target.value }))
                        }
                        placeholder="Запишите здесь ключевые мысли, которые вы бы сказали на интервью..."
                        className="w-full rounded-xl bg-slate-50 border border-slate-300 p-3.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <button
                      onClick={() => {
                        sound.playClick(progress.soundEnabled);
                        setRevealedRubric((prev) => ({ ...prev, [gp.id]: !prev[gp.id] }));
                      }}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
                    >
                      {isRevealed
                        ? 'Скрыть образец ответа'
                        : 'Показать ключевые пункты и готовый образец ответа →'}
                    </button>

                    {isRevealed && (
                      <div className="space-y-5 pt-4 border-t border-slate-200">
                        <div className="space-y-2.5">
                          <div className="text-xs sm:text-sm font-bold text-emerald-800">
                            Шаг 2. Отметьте мысли, которые вы не забыли упомянуть в своем ответе:
                          </div>
                          {gp.greenFlags.map((flag, idx) => {
                            const isHit = checked.includes(idx);
                            return (
                              <label
                                key={idx}
                                onClick={() => handleToggleGrillFlag(gp.id, idx)}
                                className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
                                  isHit
                                    ? 'bg-emerald-50 border-emerald-400 text-slate-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isHit}
                                  onChange={() => {}}
                                  className="mt-1 accent-emerald-600"
                                />
                                <span className="text-xs sm:text-sm leading-relaxed">{flag}</span>
                              </label>
                            );
                          })}
                        </div>

                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5">
                          <div className="text-xs font-bold uppercase text-rose-700">
                            Частые ошибки на этом вопросе (Чего говорить не стоит):
                          </div>
                          <ul className="space-y-1">
                            {gp.redFlags.map((rf, i) => (
                              <li key={i} className="text-xs sm:text-sm text-slate-800">
                                • {rf}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-5 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2">
                          <div className="text-xs font-bold uppercase text-blue-800">
                            Готовый образец полного ответа для собеседования:
                          </div>
                          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                            {gp.idealAnswerScript}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {/* ПОДВАЛ */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500">
        Курс подготовки к техническому собеседованию: ML / AI Инженер (Python Backend)
      </footer>
    </div>
  );
}
