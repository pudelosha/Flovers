import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { TextInput } from 'react-native-paper';
import { ApiError } from '../../../../api/client';
import ConfirmEmailScreen from '../ConfirmEmailScreen';
import ForgotPasswordScreen from '../ForgotPasswordScreen';
import ResendActivationScreen from '../ResendActivationScreen';
import ResetPasswordScreen from '../ResetPasswordScreen';

const mockT = (key: string) => key;
let mockParams: Record<string, string | undefined> = {};
let mockSession: string | null = null;
const mockConfirm = jest.fn();
const mockRequest = jest.fn();
const mockResend = jest.fn();
const mockReset = jest.fn();
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock('@react-navigation/native', () => ({ useRoute: () => ({ params: mockParams }) }));
jest.mock('../../../../app/providers/useAuth', () => ({ useAuth: () => ({
  token: mockSession, confirmEmail: mockConfirm, requestPasswordReset: mockRequest,
  resendActivation: mockResend, resetPassword: mockReset,
}) }));
jest.mock('../../../../shared/ui/TopSnackbar', () => (props: any) => props.visible
  ? require('react').createElement(require('react-native').Text, { accessibilityRole: 'alert' }, props.message) : null);

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  [mockConfirm, mockRequest, mockResend, mockReset].forEach(fn => fn.mockReset());
  mockParams = {}; mockSession = null;
});
afterEach(() => {
  cleanup();
  act(() => jest.runOnlyPendingTimers());
  jest.useRealTimers();
});

it('shows activation progress, submits link credentials, then offers login without logging in automatically', async () => {
  mockParams = { url: 'flovers://confirm?u=synthetic-uid&code=synthetic-token&email=person%40example.test' };
  const pending = deferred(); mockConfirm.mockReturnValueOnce(pending.promise);
  const navigation = { navigate: jest.fn() };
  const view = render(<ConfirmEmailScreen navigation={navigation} />);
  expect(view.getByText('confirmEmail.confirming')).toBeTruthy();
  expect(view.queryByText('confirmEmail.goToLogin')).toBeNull();
  expect(mockConfirm).toHaveBeenCalledWith({ uid: 'synthetic-uid', token: 'synthetic-token' });
  await act(async () => pending.resolve());
  expect(view.getByText('confirmEmail.success')).toBeTruthy();
  expect(navigation.navigate).not.toHaveBeenCalled();
  fireEvent.press(view.getByText('confirmEmail.goToLogin'));
  expect(navigation.navigate).toHaveBeenCalledWith('Login');
});

it.each([{}, { uid: 'uid' }, { url: 'flovers://confirm?token=only-token' }])('rejects incomplete activation links without an API request: %p', params => {
  mockParams = params;
  const navigation = { navigate: jest.fn() };
  const view = render(<ConfirmEmailScreen navigation={navigation} />);
  expect(view.getByText('confirmEmail.invalidLink')).toBeTruthy();
  expect(mockConfirm).not.toHaveBeenCalled();
  fireEvent.press(view.getByText('confirmEmail.resendActivation'));
  expect(navigation.navigate).toHaveBeenCalledWith('ResendActivation', { email: undefined });
});

it('handles an expired activation token and offers a new activation email for that address', async () => {
  mockParams = { uid: 'uid', token: 'expired', email: 'person@example.test' };
  mockConfirm.mockRejectedValueOnce(new ApiError(400, { message: 'Invalid or expired token.' }));
  const navigation = { navigate: jest.fn() };
  const view = render(<ConfirmEmailScreen navigation={navigation} />);
  await act(async () => {});
  expect(view.getByRole('alert').props.children).toBe('confirmEmail.activationFailed');
  fireEvent.press(view.getByText('confirmEmail.resendActivation'));
  expect(navigation.navigate).toHaveBeenCalledWith('ResendActivation', { email: 'person@example.test' });
});

it('allows leaving activation while its request is pending without later automatic navigation', async () => {
  mockParams = { uid: 'uid', token: 'token' };
  const pending = deferred(); mockConfirm.mockReturnValueOnce(pending.promise);
  const navigation = { navigate: jest.fn() };
  const view = render(<ConfirmEmailScreen navigation={navigation} />);
  fireEvent.press(view.getByText('confirmEmail.backToLogin'));
  expect(navigation.navigate).toHaveBeenCalledTimes(1);
  view.unmount();
  await act(async () => pending.resolve());
  expect(navigation.navigate).toHaveBeenCalledTimes(1);
});

describe.each([
  ['forgotPassword', ForgotPasswordScreen, mockRequest],
  ['resendActivation', ResendActivationScreen, mockResend],
] as const)('%s email form', (scope, Screen, request) => {
  it('validates required email locally', () => {
    const view = render(<Screen navigation={{ navigate: jest.fn() }} />);
    fireEvent.press(view.getByText(`${scope}.sendButton`));
    expect(view.getByRole('alert').props.children).toBe(`${scope}.errors.emailRequired`);
    expect(request).not.toHaveBeenCalled();
  });

  it('prevents repeated button submissions while loading, shows API error, and allows retry', async () => {
    const pending = deferred(); request.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(undefined);
    const view = render(<Screen navigation={{ navigate: jest.fn() }} />);
    fireEvent.changeText(view.UNSAFE_getByType(TextInput), 'person@example.test');
    fireEvent.press(view.getByText(`${scope}.sendButton`));
    fireEvent.press(view.getByText(`${scope}.sendButton`));
    expect(request).toHaveBeenCalledTimes(1);
    expect(view.getByRole('button', { name: `${scope}.sendButton` })).toBeDisabled();
    await act(async () => pending.reject(new ApiError(429, { message: 'Please try again later.' })));
    expect(view.getByRole('alert').props.children).toBe('Please try again later.');
    expect(view.getByRole('button', { name: `${scope}.sendButton` })).not.toBeDisabled();
    await act(async () => fireEvent.press(view.getByText(`${scope}.sendButton`)));
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith('person@example.test');
    expect(view.getByRole('alert').props.children).toBe(`${scope}.success.emailSent`);
  });

  it('uses a localized generic error for network failure and leaves via the login link', async () => {
    request.mockRejectedValueOnce(new Error('network unavailable'));
    const navigation = { navigate: jest.fn() };
    const view = render(<Screen navigation={navigation} />);
    fireEvent.changeText(view.UNSAFE_getByType(TextInput), 'person@example.test');
    await act(async () => fireEvent.press(view.getByText(`${scope}.sendButton`)));
    expect(view.getByRole('alert').props.children).toBe(`${scope}.errors.generic`);
    fireEvent.press(view.getByText(`${scope}.backToLogin`));
    expect(navigation.navigate).toHaveBeenCalledWith('Login');
  });
});

function enterPasswords(view: ReturnType<typeof render>, first: string, second = first) {
  const fields = view.UNSAFE_getAllByType(TextInput);
  fireEvent.changeText(fields[0], first); fireEvent.changeText(fields[1], second);
}
it.each(['missing-link', 'too-short', 'mismatch'])('blocks password reset with %s', invalid => {
  mockParams = invalid === 'missing-link' ? {} : { uid: 'uid', token: 'token' };
  const view = render(<ResetPasswordScreen navigation={{ navigate: jest.fn() }} />);
  enterPasswords(view, invalid === 'too-short' ? 'short' : 'long-password', invalid === 'mismatch' ? 'different' : undefined);
  expect(view.getByRole('button', { name: 'resetPassword.changePassword' })).toBeDisabled();
  fireEvent.press(view.getByText('resetPassword.changePassword'));
  expect(mockReset).not.toHaveBeenCalled();
});

it.each([null, 'existing-session'])('retries a failed reset and navigates only on success (session %s)', async session => {
  mockSession = session;
  mockParams = { url: 'flovers://reset?uid=uid&key=token' };
  const pending = deferred(); mockReset.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(undefined);
  const navigation = { navigate: jest.fn() };
  const view = render(<ResetPasswordScreen navigation={navigation} />);
  enterPasswords(view, 'new-password');
  fireEvent.press(view.getByText('resetPassword.changePassword'));
  expect(view.getByRole('button', { name: 'resetPassword.changePassword' })).toBeDisabled();
  await act(async () => pending.reject(new ApiError(400, { message: 'Invalid or expired token.' })));
  expect(view.getByRole('alert').props.children).toBe('Invalid or expired token.');
  expect(navigation.navigate).not.toHaveBeenCalled();
  await act(async () => fireEvent.press(view.getByText('resetPassword.changePassword')));
  expect(mockReset).toHaveBeenCalledWith({ uid: 'uid', token: 'token', new_password: 'new-password' });
  expect(navigation.navigate).toHaveBeenCalledWith(session ? 'Home' : 'Login');
});
