import { act, renderHook } from '@testing-library/react-native';
import { createRequestGuard, useRequestGuard } from '../useRequestGuard';

it('accepts only the latest request when responses arrive out of order', async () => {
  const guard = createRequestGuard();
  let finishOld!: (value: string) => void;
  const oldResponse = new Promise<string>(resolve => { finishOld = resolve; });
  const values: string[] = [];
  const oldIsCurrent = guard.begin();
  const oldRequest = oldResponse.then(value => {
    if (oldIsCurrent()) values.push(value);
  });
  const newIsCurrent = guard.begin();
  if (newIsCurrent()) values.push('new');
  finishOld('old');
  await oldRequest;
  expect(values).toEqual(['new']);
});

it('invalidates responses from previous visits even after the screen is reactivated', () => {
  const guard = createRequestGuard();
  const previousVisit = guard.begin();
  guard.invalidate();
  expect(previousVisit()).toBe(false);
  expect(guard.begin()()).toBe(false);
  guard.activate();
  expect(previousVisit()).toBe(false);
  expect(guard.begin()()).toBe(true);
});

it('invalidates pending requests when the component unmounts', () => {
  const { result, unmount } = renderHook(useRequestGuard);
  let isCurrent!: () => boolean;
  act(() => { isCurrent = result.current.begin(); });
  expect(isCurrent()).toBe(true);
  unmount();
  expect(isCurrent()).toBe(false);
});
