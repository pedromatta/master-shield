import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { GmDashboardComponent } from './gm-dashboard.component';
import { WindowManagerService } from '../../core/windows/window-manager.service';

const CAMPAIGN = {
  id: 'c1',
  userId: 'u1',
  name: 'Masks of Nyarlathotep',
  gameSystemId: 'g1',
  systemData: {},
  currentMapLocationId: null,
};

const SESSION = {
  id: 's1',
  campaignId: 'c1',
  sessionNumber: 1,
  title: 'Peru',
  datePlayed: '2026-09-14T00:00:00Z',
  log: 'Arrived in Lima.',
};

describe('GmDashboardComponent', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GmDashboardComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    TestBed.inject(WindowManagerService).closeAll();
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  /**
   * Drains the shell's bootstrap cascade one microtask turn at a time: campaigns, users,
   * game systems, sessions, then the per-campaign content collections.
   */
  async function drainBootstrap(
    fixture: ComponentFixture<GmDashboardComponent>,
    options: { campaigns?: unknown[]; users?: unknown[]; sessions?: unknown[] } = {},
  ) {
    let idleTurns = 0;

    for (let turn = 0; turn < 200 && idleTurns < 5; turn++) {
      await Promise.resolve();
      await fixture.whenStable();

      const pending = http.match(() => true);
      if (pending.length === 0) {
        idleTurns++;
        await new Promise((resolve) => setTimeout(resolve, 0));
        continue;
      }

      idleTurns = 0;
      for (const request of pending) {
        const url = request.request.url;
        if (url.endsWith('/api/campaigns')) {
          request.flush(options.campaigns ?? [CAMPAIGN]);
        } else if (url.endsWith('/api/users')) {
          request.flush(options.users ?? [{ id: 'u1', username: 'gm', email: 'gm@example.com' }]);
        } else if (url.endsWith('/api/game-systems')) {
          request.flush([{ id: 'g1', name: 'Call of Cthulhu', version: '7e' }]);
        } else if (url.includes('/api/sessions/campaign/')) {
          request.flush(options.sessions ?? [SESSION]);
        } else {
          request.flush([]);
        }
      }
    }

    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('renders the shell with the character rail, work area and tool bar', async () => {
    const fixture = TestBed.createComponent(GmDashboardComponent);
    fixture.detectChanges();
    await drainBootstrap(fixture);

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Master Shield');
    // Campaigns and sessions are managed inside their own windows, not inline in the bar.
    expect(host.textContent).toContain('Campaigns');
    expect(host.textContent).toContain('Sessions');
    expect(host.querySelector('app-character-sidebar')).toBeTruthy();
    expect(host.querySelector('app-window-host')).toBeTruthy();
    expect(host.querySelector('app-tool-bar')).toBeTruthy();
  });

  it('exposes the six tools in the bottom bar', async () => {
    const fixture = TestBed.createComponent(GmDashboardComponent);
    fixture.detectChanges();
    await drainBootstrap(fixture);

    const host = fixture.nativeElement as HTMLElement;
    const labels = [...host.querySelectorAll('app-tool-bar button')].map((b) =>
      b.getAttribute('aria-label'),
    );

    expect(labels).toContain('Open Notes');
    expect(labels).toContain('Open NPCs');
    expect(labels).toContain('Open Encounter');
    expect(labels).toContain('Open Counters');
    expect(labels).toContain('Open Locations');
    expect(labels).toContain('Open Rules');
  });

  it('opens a window when a tool is clicked and minimizes it to the dock', async () => {
    const fixture = TestBed.createComponent(GmDashboardComponent);
    fixture.detectChanges();
    await drainBootstrap(fixture);

    const windows = TestBed.inject(WindowManagerService);
    const host = fixture.nativeElement as HTMLElement;

    const notesButton = [...host.querySelectorAll('app-tool-bar button')].find(
      (b) => b.getAttribute('aria-label') === 'Open Notes',
    );
    expect(notesButton).toBeTruthy();
    notesButton!.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();
    await fixture.whenStable();

    const opened = windows.windows().find((w) => w.kind === 'notes');
    expect(opened).toBeTruthy();
    expect(host.querySelectorAll('app-window-frame').length).toBeGreaterThan(0);

    windows.toggleMinimized(opened!.id);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(windows.minimizedWindows().length).toBe(1);
    expect(host.querySelector('[aria-label="Minimized windows"]')).toBeTruthy();
  });

  it('offers campaign setup when the signed-in GM has no campaigns', async () => {
    const fixture = TestBed.createComponent(GmDashboardComponent);
    fixture.detectChanges();
    await drainBootstrap(fixture, { campaigns: [], users: [] });

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-campaign-create')).toBeTruthy();
    // Accounts are created on the sign-in screen, so the campaign form only asks for a name.
    expect(host.querySelector('#campaign-name')).toBeTruthy();
    expect(host.querySelector('#owner-username')).toBeFalsy();
  });
});
