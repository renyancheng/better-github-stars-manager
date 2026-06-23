import { getMessages, useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types';

const LOCALES: { value: Locale; short: string; name: string }[] = [
  { value: 'en', short: 'EN', name: getMessages('en').localeName },
  { value: 'zh-CN', short: '中文', name: getMessages('zh-CN').localeName },
];

export function FloatingLocaleToggle({ drawerOpen }: { drawerOpen: boolean }) {
  const { locale, setLocale, m } = useI18n();

  return (
    <div
      className={cn(
        'absolute bottom-4 z-20 transition-[right] duration-200',
        drawerOpen ? 'right-4 md:right-[356px]' : 'right-4',
      )}
    >
      <div className="flex items-center gap-2 rounded-full border border-border bg-background/90 px-2 py-1.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <span className="pl-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {m.options.languageLabel}
        </span>
        <div
          role="group"
          aria-label={m.options.languageLabel}
          className="inline-flex rounded-full bg-muted p-0.5"
        >
          {LOCALES.map((entry) => {
            const active = locale === entry.value;
            return (
              <button
                key={entry.value}
                type="button"
                aria-pressed={active}
                title={active ? m.common.current(entry.name) : entry.name}
                onClick={() => {
                  if (!active) void setLocale(entry.value);
                }}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground',
                )}
              >
                {entry.short}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
