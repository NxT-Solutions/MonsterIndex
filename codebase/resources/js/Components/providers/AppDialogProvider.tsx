import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import { Button } from '@/Components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { useLocale } from '@/lib/locale';
import {
    createContext,
    PropsWithChildren,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

type ConfirmOptions = {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
};

type PromptOptions = ConfirmOptions & {
    defaultValue?: string;
    placeholder?: string;
    label?: string;
    required?: boolean;
};

type DialogContextValue = {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    prompt: (options: PromptOptions) => Promise<string | null>;
};

type ConfirmState = (ConfirmOptions & {
    open: boolean;
    resolve: (value: boolean) => void;
}) | null;

type PromptState = (PromptOptions & {
    open: boolean;
    resolve: (value: string | null) => void;
}) | null;

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export function AppDialogProvider({ children }: PropsWithChildren) {
    const { x } = useLocale();
    const [confirmState, setConfirmState] = useState<ConfirmState>(null);
    const [promptState, setPromptState] = useState<PromptState>(null);
    const [promptValue, setPromptValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (promptState?.open) {
            setPromptValue(promptState.defaultValue ?? '');
            window.setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [promptState]);

    const value = useMemo<DialogContextValue>(() => {
        return {
            confirm: (options) =>
                new Promise<boolean>((resolve) => {
                    setConfirmState({
                        ...options,
                        open: true,
                        resolve,
                    });
                }),
            prompt: (options) =>
                new Promise<string | null>((resolve) => {
                    setPromptState({
                        ...options,
                        open: true,
                        resolve,
                    });
                }),
        };
    }, []);

    return (
        <DialogContext.Provider value={value}>
            {children}

            <AlertDialog
                open={Boolean(confirmState?.open)}
                onOpenChange={(open) => {
                    if (!open && confirmState) {
                        confirmState.resolve(false);
                        setConfirmState(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmState?.title}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmState?.description ??
                                x(
                                    'Please review this action before continuing.',
                                    'Controleer deze actie voordat je verdergaat.',
                                )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => {
                                if (!confirmState) {
                                    return;
                                }

                                confirmState.resolve(false);
                                setConfirmState(null);
                            }}
                        >
                            {confirmState?.cancelLabel ??
                                x('Cancel', 'Annuleren')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className={
                                confirmState?.destructive
                                    ? 'bg-[color:var(--destructive)] text-[color:var(--destructive-foreground)] hover:brightness-105'
                                    : undefined
                            }
                            onClick={() => {
                                if (!confirmState) {
                                    return;
                                }

                                confirmState.resolve(true);
                                setConfirmState(null);
                            }}
                        >
                            {confirmState?.confirmLabel ??
                                x('Continue', 'Doorgaan')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog
                open={Boolean(promptState?.open)}
                onOpenChange={(open) => {
                    if (!open && promptState) {
                        promptState.resolve(null);
                        setPromptState(null);
                    }
                }}
            >
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{promptState?.title}</DialogTitle>
                        <DialogDescription>
                            {promptState?.description ??
                                x(
                                    'Please review this action before continuing.',
                                    'Controleer deze actie voordat je verdergaat.',
                                )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <label
                            htmlFor="app-dialog-input"
                            className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground-soft)]"
                        >
                            {promptState?.label ??
                                x('Optional note', 'Optionele notitie')}
                        </label>
                        <Input
                            id="app-dialog-input"
                            ref={inputRef}
                            value={promptValue}
                            placeholder={
                                promptState?.placeholder ??
                                x('Enter a value', 'Voer een waarde in')
                            }
                            onChange={(event) => setPromptValue(event.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                if (!promptState) {
                                    return;
                                }

                                promptState.resolve(null);
                                setPromptState(null);
                            }}
                        >
                            {promptState?.cancelLabel ?? x('Cancel', 'Annuleren')}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                if (!promptState) {
                                    return;
                                }

                                const trimmed = promptValue.trim();
                                if (promptState.required && trimmed === '') {
                                    return;
                                }

                                promptState.resolve(trimmed);
                                setPromptState(null);
                            }}
                        >
                            {promptState?.confirmLabel ?? x('Save', 'Opslaan')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DialogContext.Provider>
    );
}

export function useAppDialogs(): DialogContextValue {
    const context = useContext(DialogContext);

    if (!context) {
        throw new Error('useAppDialogs must be used within AppDialogProvider');
    }

    return context;
}
