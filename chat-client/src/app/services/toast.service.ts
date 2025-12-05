import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({ providedIn: 'root' })
export class ToastService {
  toast$ = new BehaviorSubject<{ message: string; type: 'success' | 'error' | '' }>({
    message: '',
    type: ''
  });

  showSuccess(message: string) {
    this.toast$.next({ message, type: 'success' });
    this.hideAfterDelay();
  }

  showError(message: string) {
    this.toast$.next({ message, type: 'error' });
    this.hideAfterDelay();
  }

  private hideAfterDelay() {
    setTimeout(() => {
      this.toast$.next({ message: '', type: '' });
    }, 3000);
  }
}
