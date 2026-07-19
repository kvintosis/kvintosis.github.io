import { useEffect, useMemo, useState } from 'react';
import './App.css';
import Modal from './Modal';

const columns = [
  { key: 'lastName', label: 'Фамилия', width: 160 },
  { key: 'firstName', label: 'Имя', width: 140 },
  { key: 'maidenName', label: 'Отчество', width: 140 },
  { key: 'age', label: 'Возраст', width: 100 },
  { key: 'gender', label: 'Пол', width: 100 },
  { key: 'phone', label: 'Телефон', width: 170 },
  { key: 'email', label: 'Email', width: 220 },
  { key: 'address.country', label: 'Страна', width: 140 },
  { key: 'address.city', label: 'Город', width: 140 },
];

const sortModes = ['none', 'asc', 'desc'];
const pageSize = 10;
const requestLimit = 100;
const totalUsersLimit = 1000;
const exactMatchFields = new Set(['gender']);

const initialFilters = {
  lastName: '',
  firstName: '',
  maidenName: '',
  age: '',
  gender: '',
  phone: '',
  email: '',
  country: '',
  city: '',
};

const sortModeLabels = {
  asc: '↑',
  desc: '↓',
};

const filterFieldMap = {
  country: 'address.country',
  city: 'address.city',
};

function getNestedValue(item, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], item);
}

function normalizeText(value) {
  return `${value || ''}`.toLowerCase();
}

function getFilterFieldKey(key) {
  return filterFieldMap[key] || key;
}

async function fetchAllUsers() {
  const allUsers = [];
  let skip = 0;

  while (allUsers.length < totalUsersLimit) {
    const response = await fetch(`https://dummyjson.com/users?limit=${requestLimit}&skip=${skip}`);
    if (!response.ok) {
      throw new Error('Не удалось загрузить пользователей');
    }

    const data = await response.json();
    const batch = data.users || [];
    allUsers.push(...batch);

    if (!batch.length) {
      break;
    }

    skip += batch.length;

    if (batch.length < requestLimit) {
      break;
    }
  }

  return allUsers;
}

function intersectUsers(leftUsers, rightUsers) {
  const allowedIds = new Set(rightUsers.map((user) => user.id));
  return leftUsers.filter((user) => allowedIds.has(user.id));
}

function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [filters, setFilters] = useState(initialFilters);
  const [sortState, setSortState] = useState([]);
  const [columnWidths, setColumnWidths] = useState(() => Object.fromEntries(columns.map((col) => [col.key, col.width])));
  const [activeUser, setActiveUser] = useState(null);
  const [draggingColumn, setDraggingColumn] = useState(null);
  const [dragStart, setDragStart] = useState(null);

  const applyUsers = (nextUsers) => {
    setUsers(nextUsers);
    setTotalUsers(nextUsers.length);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const allUsers = await fetchAllUsers();

      applyUsers(allUsers);
    } catch (e) {
      setError(e.message || 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  const searchUsersByFields = async (nextFilters) => {
    const activeEntries = Object.entries(nextFilters).filter(([, value]) => `${value || ''}`.trim());

    if (!activeEntries.length) {
      await loadUsers();
      return;
    }

    try {
      setLoading(true);
      setError('');

      let results = [];

      for (const [filterKey, filterValue] of activeEntries) {
        const mappedKey = getFilterFieldKey(filterKey);

        if (exactMatchFields.has(filterKey)) {
          const response = await fetch(
            `https://dummyjson.com/users/filter?key=${encodeURIComponent(mappedKey)}&value=${encodeURIComponent(filterValue)}`
          );

          if (!response.ok) {
            throw new Error('Не удалось выполнить поиск');
          }

          const data = await response.json();
          const usersForField = data.users || [];

          results = results.length ? intersectUsers(results, usersForField) : usersForField;
          continue;
        }

        const normalizedValue = normalizeText(filterValue);
        const usersForField = users.filter((user) => {
          const value = getNestedValue(user, mappedKey);
          return normalizeText(value).includes(normalizedValue);
        });

        results = results.length ? intersectUsers(results, usersForField) : usersForField;
      }

      applyUsers(results);
    } catch (e) {
      setError(e.message || 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitialUsers() {
      try {
        setLoading(true);
        setError('');

        const allUsers = await fetchAllUsers();

        if (!ignore) {
          applyUsers(allUsers);
        }
      } catch (e) {
        if (!ignore) {
          setError(e.message || 'Что-то пошло не так');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadInitialUsers();
    return () => {
      ignore = true;
    };
  }, []);

  const sortedUsers = useMemo(() => {
    const list = [...users];
    if (!sortState.length) return list;

    const originalIndex = new Map(list.map((user, index) => [user.id, index]));

    list.sort((a, b) => {
      for (const criterion of sortState) {
        const left = getNestedValue(a, criterion.key);
        const right = getNestedValue(b, criterion.key);
        const leftValue = typeof left === 'number' ? left : `${left || ''}`.toLowerCase();
        const rightValue = typeof right === 'number' ? right : `${right || ''}`.toLowerCase();

        if (leftValue < rightValue) return criterion.mode === 'asc' ? -1 : 1;
        if (leftValue > rightValue) return criterion.mode === 'asc' ? 1 : -1;
      }

      return originalIndex.get(a.id) - originalIndex.get(b.id);
    });

    return list;
  }, [users, sortState]);

  const pageCount = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const startIndex = (safePage - 1) * pageSize;
  const visibleUsers = sortedUsers.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [filters, sortState]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const handleSort = (key, shouldAppend = false) => {
    setSortState((prev) => {
      const currentCriterion = prev.find((item) => item.key === key);
      const nextMode = currentCriterion
        ? sortModes[(sortModes.indexOf(currentCriterion.mode) + 1) % sortModes.length]
        : 'asc';

      const nextSort = shouldAppend ? prev.filter((item) => item.key !== key) : [];

      if (nextMode === 'none') {
        return nextSort;
      }

      return [...nextSort, { key, mode: nextMode }];
    });
  };

  const handleFilterChange = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    searchUsersByFields(nextFilters);
  };

  const startResize = (key, event) => {
    event.preventDefault();
    setDraggingColumn(key);
    setDragStart({ startX: event.clientX, startWidth: columnWidths[key] });
  };

  useEffect(() => {
    if (!draggingColumn || !dragStart) return;

    const onMove = (event) => {
      const nextWidth = Math.max(50, dragStart.startWidth + (event.clientX - dragStart.startX));
      setColumnWidths((prev) => ({
        ...prev,
        [draggingColumn]: nextWidth,
      }));
    };

    const onUp = () => {
      setDraggingColumn(null);
      setDragStart(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draggingColumn, dragStart]);

  const renderSortLabel = (key) => {
    const index = sortState.findIndex((item) => item.key === key);
    if (index === -1) return '↕';

    const criterion = sortState[index];
    const modeLabel = sortModeLabels[criterion.mode] || '↕';
    return `${modeLabel}${index + 1}`;
  };

  return (
    <div className="app-shell">
      <div className="panel">
        <div className="panel-head">
          <h1>Таблица пользователей</h1>
          <p>Shift+клик по заголовку добавляет поле к сортировке. Обычный клик заменяет текущую сортировку.</p>
        </div>

        <div className="toolbar">
          {columns.map((col) => {
            const fieldKey = col.key === 'address.country' ? 'country' : col.key === 'address.city' ? 'city' : col.key;
            return (
              <div className="field" key={col.key}>
                <label htmlFor={col.key}>{col.label}</label>
                <input
                  id={col.key}
                  value={filters[fieldKey] ?? ''}
                  onChange={(event) => handleFilterChange(fieldKey, event.target.value)}
                  placeholder={`Фильтр по ${col.label.toLowerCase()}`}
                />
              </div>
            );
          })}
        </div>

        <div className="status-bar">
          <span className="badge">{sortedUsers.length} из {totalUsers || sortedUsers.length} пользователей</span>
          <span>Страница {safePage} из {pageCount}</span>
        </div>

        {error ? <div className="error">{error}</div> : null}

        {loading ? (
          <div className="empty-state">Загрузка данных…</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key} style={{ width: columnWidths[col.key] }}>
                        <div className="cell-menu">
                          <button
                            className="sort-btn"
                            type="button"
                            title="Клик — заменить сортировку, Shift+клик — добавить поле"
                            onClick={(event) => handleSort(col.key, event.shiftKey)}
                          >
                            {col.label}
                          </button>
                          <span>{renderSortLabel(col.key)}</span>
                          <span className="resize-handle" onMouseDown={(event) => startResize(col.key, event)} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.length ? (
                    visibleUsers.map((user) => (
                      <tr key={user.id} onClick={() => setActiveUser(user)}>
                        <td style={{ width: columnWidths[columns[0].key] }}>{user.lastName}</td>
                        <td style={{ width: columnWidths[columns[1].key] }}>{user.firstName}</td>
                        <td style={{ width: columnWidths[columns[2].key] }}>{user.maidenName}</td>
                        <td style={{ width: columnWidths[columns[3].key] }}>{user.age}</td>
                        <td style={{ width: columnWidths[columns[4].key] }}>{user.gender}</td>
                        <td style={{ width: columnWidths[columns[5].key] }}>{user.phone}</td>
                        <td style={{ width: columnWidths[columns[6].key] }}>{user.email}</td>
                        <td style={{ width: columnWidths[columns[7].key] }}>{user.address?.country}</td>
                        <td style={{ width: columnWidths[columns[8].key] }}>{user.address?.city}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="empty-state">
                        Ничего не найдено.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="page-bar">
              <span> {visibleUsers.length} из {sortedUsers.length}</span>
              <div className="page-btns">
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
                  <button
                    key={item}
                    className={item === safePage ? 'active' : ''}
                    type="button"
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <Modal user={activeUser} onClose={() => setActiveUser(null)} />
    </div>
  );
}

export default App;
