import * as Dialog from '@radix-ui/react-dialog';

export function RadixDemo() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-sm">
        Open Dialog
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed inset-0 m-auto max-w-md w-[90%] rounded-lg bg-neutral-900 p-4 border border-neutral-800">
          <Dialog.Title className="font-medium">Hello from Radix UI</Dialog.Title>
          <Dialog.Description className="text-sm opacity-70 mt-1">
            This is a minimal Dialog using @radix-ui/react-dialog.
          </Dialog.Description>
          <div className="mt-4 flex justify-end">
            <Dialog.Close className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-sm">
              Close
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

