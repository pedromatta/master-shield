import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TagEditorComponent } from './tag-editor.component';

describe('TagEditorComponent', () => {
  let fixture: ComponentFixture<TagEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagEditorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TagEditorComponent);
    fixture.componentRef.setInput('category', 'Actor');
    fixture.detectChanges();
  });

  it('enables the Add button once a name is typed', () => {
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      'input[type="text"]',
    ) as HTMLInputElement;
    input.value = 'Heroic';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    const add = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b: HTMLButtonElement) => b.textContent?.trim() === 'Add',
    ) as HTMLButtonElement;

    expect(add).toBeTruthy();
    expect(add.disabled).toBe(false);
  });
});
