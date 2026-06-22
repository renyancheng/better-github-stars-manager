import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { usePortalContainer } from './portal-context';

const Popover = ({ children, ...props }: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>) => {
  const container = usePortalContainer();
  return (
    <PopoverPrimitive.Root {...props}>
      {/* Portaling into the shadow root container keeps the popover inside our
          Tailwind/theme scope instead of escaping to document.body. */}
      {container ? <PopoverPrimitive.Portal container={container}>{children}</PopoverPrimitive.Portal> : <PopoverPrimitive.Portal>{children}</PopoverPrimitive.Portal>}
    </PopoverPrimitive.Root>
  );
};

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'start', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
