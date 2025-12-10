import { ElementRef } from '@angular/core';

export function scrollToBottom(element: ElementRef): void {
    if (!element || !element.nativeElement) return;
    try {
        element.nativeElement.scrollTop = element.nativeElement.scrollHeight;
    } catch (err) {
        console.error('Scroll to bottom failed:', err);
    }
}

export async function copyToClipboard(text: string): Promise<void> {
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        console.log('Text copied to clipboard');
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
}
