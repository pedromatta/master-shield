import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemDataEditorComponent } from './system-data-editor.component';
import { SystemData } from '../../core/models/common.model';

describe('SystemDataEditorComponent', () => {
  let fixture: ComponentFixture<SystemDataEditorComponent>;
  let component: SystemDataEditorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemDataEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SystemDataEditorComponent);
    component = fixture.componentInstance;
  });

  async function render(systemData: SystemData): Promise<HTMLElement> {
    fixture.componentRef.setInput('systemData', systemData);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders one row per entry, sorted by key', async () => {
    const host = await render({ sanity: 40, armorClass: 15 });

    const keys = [...host.querySelectorAll<HTMLInputElement>('input[id^="sd-key-"]')].map(
      (input) => input.value,
    );
    expect(keys).toEqual(['armorClass', 'sanity']);
  });

  it('emits a change when a value is edited', async () => {
    const host = await render({ armorClass: 15 });
    const emitted: SystemData[] = [];
    component.systemDataChange.subscribe((value) => emitted.push(value));

    const valueInput = host.querySelector<HTMLInputElement>('input[type="number"]');
    expect(valueInput).toBeTruthy();
    valueInput!.value = '18';
    valueInput!.dispatchEvent(new Event('input'));

    expect(emitted).toEqual([{ armorClass: 18 }]);
  });

  it('adds a new key-value pair', async () => {
    const host = await render({});
    const emitted: SystemData[] = [];
    component.systemDataChange.subscribe((value) => emitted.push(value));

    const newKeyInput = host.querySelector<HTMLInputElement>('#system-data-new-key');
    expect(newKeyInput).toBeTruthy();
    newKeyInput!.value = 'spellSlots';
    newKeyInput!.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    host.querySelector<HTMLButtonElement>('footer button')!.click();

    expect(emitted).toEqual([{ spellSlots: '' }]);
  });

  it('rejects duplicate keys', async () => {
    const host = await render({ armorClass: 15 });
    const emitted: SystemData[] = [];
    component.systemDataChange.subscribe((value) => emitted.push(value));

    const newKeyInput = host.querySelector<HTMLInputElement>('#system-data-new-key');
    newKeyInput!.value = 'armorClass';
    newKeyInput!.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    host.querySelector<HTMLButtonElement>('footer button')!.click();
    await fixture.whenStable();

    expect(emitted).toEqual([]);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('already exists');
  });

  it('removes an entry', async () => {
    const host = await render({ armorClass: 15, sanity: 40 });
    const emitted: SystemData[] = [];
    component.systemDataChange.subscribe((value) => emitted.push(value));

    host.querySelector<HTMLButtonElement>('button[aria-label="Remove armorClass"]')!.click();

    expect(emitted).toEqual([{ sanity: 40 }]);
  });

  it('renames a key while preserving its value', async () => {
    const host = await render({ ac: 15 });
    const emitted: SystemData[] = [];
    component.systemDataChange.subscribe((value) => emitted.push(value));

    const keyInput = host.querySelector<HTMLInputElement>('#sd-key-ac')!;
    keyInput.value = 'armorClass';
    keyInput.dispatchEvent(new Event('change'));

    expect(emitted).toEqual([{ armorClass: 15 }]);
  });
});
