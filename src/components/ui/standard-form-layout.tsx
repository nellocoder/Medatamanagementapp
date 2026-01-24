import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';
import { Button } from './button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { cn } from './utils';

interface StandardFormProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onSubmit?: () => void;
  className?: string;
}

export function StandardForm({ 
  title, 
  description, 
  children, 
  actions, 
  onSubmit,
  className 
}: StandardFormProps) {
  return (
    <div className={cn("space-y-6 max-w-5xl mx-auto pb-24", className)}>
      {(title || description) && (
        <div className="mb-6 space-y-1">
          {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
          {description && <p className="text-gray-500">{description}</p>}
        </div>
      )}
      
      <div className="space-y-6">
        {children}
      </div>

      {actions && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-40 md:pl-72 flex justify-end items-center gap-3">
          <div className="w-full max-w-5xl mx-auto flex justify-end gap-3 px-4 md:px-0">
            {actions}
          </div>
        </div>
      )}
    </div>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  required?: boolean;
  status?: 'complete' | 'incomplete' | 'error' | 'none';
  icon?: React.ReactNode;
  className?: string;
}

export function FormSection({ 
  title, 
  description, 
  children, 
  defaultOpen = true, 
  required = false,
  status = 'none',
  icon,
  className
}: FormSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={cn("overflow-visible transition-all duration-200", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className={cn(
          "sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm", // Added sticky positioning and z-index
          "px-4 md:px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors touch-manipulation min-h-[64px]",
          !isOpen && "border-b-0",
        )} onClick={() => setIsOpen(!isOpen)}>
          <div className="flex items-center gap-3">
            {icon && <div className="text-gray-500 shrink-0">{icon}</div>}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 text-lg leading-tight">{title}</h3>
                {required && <span className="text-red-500 text-[10px] md:text-xs font-medium uppercase bg-red-50 px-2 py-0.5 rounded-full border border-red-100 shrink-0">Required</span>}
                {status === 'complete' && <span className="text-green-600 text-[10px] md:text-xs font-medium uppercase bg-green-50 px-2 py-0.5 rounded-full border border-green-100 shrink-0">Complete</span>}
              </div>
              {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 h-9 p-0 rounded-full shrink-0">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="p-4 md:p-6 bg-white animate-in slide-in-from-top-2 duration-200">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface FormRowProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function FormRow({ children, columns = 2, className }: FormRowProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3', // Optimized for large screens
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn("grid gap-4 md:gap-6", gridCols[columns], className)}>
      {children}
    </div>
  );
}
