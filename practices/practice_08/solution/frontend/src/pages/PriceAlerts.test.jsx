import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PriceAlerts from './PriceAlerts';

const mocks = vi.hoisted(() => ({
  alerts: vi.fn(),
  createAlert: vi.fn(),
  cancelAlert: vi.fn(),
  refresh: vi.fn(),
  setToast: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: {
    alerts: mocks.alerts,
    createAlert: mocks.createAlert,
    cancelAlert: mocks.cancelAlert,
  },
}));

vi.mock('../context/ExchangeContext', () => ({
  useExchange: () => ({
    activeUserId: 'u1',
    market: [
      { symbol: 'BTC', name: 'Bitcoin', price: 68000, color: '#f7931a' },
      { symbol: 'ETH', name: 'Ethereum', price: 3600, color: '#627eea' },
    ],
    refresh: mocks.refresh,
    setToast: mocks.setToast,
  }),
}));

const alert = {
  id: 'alert-1',
  userId: 'u1',
  symbol: 'BTC',
  condition: 'above',
  targetPrice: 75000,
  status: 'active',
  createdAt: '2026-11-22T12:00:00.000Z',
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
};

async function openDialog(user) {
  await screen.findByText('Здесь пока нет уведомлений');
  await user.click(screen.getByRole('button', { name: 'Создать уведомление' }));
  return screen.getByRole('dialog', { name: 'Создать ценовое уведомление' });
}

describe('сценарий ценовых уведомлений', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.alerts.mockResolvedValue([]);
    mocks.refresh.mockResolvedValue(undefined);
  });

  it('показывает загрузку, а затем понятное пустое состояние', async () => {
    const loading = deferred();
    mocks.alerts.mockReturnValueOnce(loading.promise);
    render(<PriceAlerts/>);

    expect(screen.getByRole('status')).toHaveTextContent('Загружаем уведомления');
    loading.resolve([]);

    expect(await screen.findByText('Здесь пока нет уведомлений')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Создать уведомление' })).toBeEnabled();
  });

  it('открывает и закрывает диалог с клавиатуры', async () => {
    const user = userEvent.setup();
    render(<PriceAlerts/>);
    await openDialog(user);

    expect(screen.getByRole('button', { name: 'Закрыть форму' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('проверяет обязательное поле и некорректную цену', async () => {
    const user = userEvent.setup();
    render(<PriceAlerts/>);
    const dialog = await openDialog(user);
    const submit = within(dialog).getByRole('button', { name: 'Создать' });

    await user.click(submit);
    expect(screen.getByRole('alert')).toHaveTextContent('Укажите целевую цену');
    expect(mocks.createAlert).not.toHaveBeenCalled();

    const price = within(dialog).getByLabelText('Целевая цена, USD');
    await user.type(price, '-1');
    await user.click(submit);
    expect(screen.getByRole('alert')).toHaveTextContent('Цена должна быть положительным числом');
    expect(price).toHaveAttribute('aria-invalid', 'true');
  });

  it('показывает ошибку API и позволяет повторить отправку', async () => {
    const user = userEvent.setup();
    mocks.createAlert.mockRejectedValueOnce(new Error('Сервис временно недоступен')).mockResolvedValueOnce({ alert });
    mocks.alerts.mockResolvedValueOnce([]).mockResolvedValueOnce([alert]);
    render(<PriceAlerts/>);
    const dialog = await openDialog(user);
    await user.type(within(dialog).getByLabelText('Целевая цена, USD'), '75000');

    await user.click(within(dialog).getByRole('button', { name: 'Создать' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Сервис временно недоступен');
    expect(within(dialog).getByLabelText('Целевая цена, USD')).toBeEnabled();

    await user.click(within(dialog).getByRole('button', { name: 'Создать' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.createAlert).toHaveBeenCalledTimes(2);
  });

  it('не создаёт второй запрос во время ожидания ответа', async () => {
    const user = userEvent.setup();
    const request = deferred();
    mocks.createAlert.mockReturnValueOnce(request.promise);
    render(<PriceAlerts/>);
    const dialog = await openDialog(user);
    await user.type(within(dialog).getByLabelText('Целевая цена, USD'), '75000');
    await user.click(within(dialog).getByRole('button', { name: 'Создать' }));

    const pendingButton = within(dialog).getByRole('button', { name: /Создаём/ });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(mocks.createAlert).toHaveBeenCalledTimes(1);

    request.resolve({ alert });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('проходит основной сценарий от ввода данных до результата в интерфейсе', async () => {
    const user = userEvent.setup();
    mocks.createAlert.mockResolvedValue({ alert });
    mocks.alerts.mockResolvedValueOnce([]).mockResolvedValueOnce([alert]);
    render(<PriceAlerts/>);
    const dialog = await openDialog(user);

    await user.selectOptions(within(dialog).getByLabelText('Криптовалюта'), 'BTC');
    await user.click(within(dialog).getByRole('button', { name: 'Цена выше' }));
    await user.type(within(dialog).getByLabelText('Целевая цена, USD'), '75000');
    await user.click(within(dialog).getByRole('button', { name: 'Создать' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.createAlert).toHaveBeenCalledWith('u1', { symbol: 'BTC', condition: 'above', targetPrice: 75000 });
    expect(await screen.findAllByText('$75,000')).not.toHaveLength(0);
    expect(screen.getAllByText('Активно').length).toBeGreaterThan(0);
    expect(mocks.setToast).toHaveBeenCalledWith({ type: 'success', text: 'Ценовое уведомление создано' });
  });

  it('показывает ошибку загрузки и восстанавливается после повтора', async () => {
    const user = userEvent.setup();
    mocks.alerts.mockRejectedValueOnce(new Error('Нет связи с API')).mockResolvedValueOnce([]);
    render(<PriceAlerts/>);

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Нет связи с API');
    await user.click(within(error).getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText('Здесь пока нет уведомлений')).toBeVisible();
  });
});
