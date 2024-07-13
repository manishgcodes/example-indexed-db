/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";

const Database = {
  name: "test-db",
  version: 1,
  usersTable: "users-table",
};

export const useIndexedDB = (databaseName: string, tableNames: string[]) => {
  const [db, setDB] = useState<IDBDatabase | null>(null);
  const [isDBConnecting, setIsDBConnecting] = useState<boolean>(true);

  useEffect(() => {
    const initDB = () => {
      try {
        if (!db) {
          setIsDBConnecting(true);
          const request = indexedDB.open(databaseName, Database.version);
          request.onupgradeneeded = () => {
            const database = request.result;
            for (const tableName of tableNames) {
              if (!database.objectStoreNames.contains(tableName)) {
                database.createObjectStore(tableName, {
                  autoIncrement: true,
                  keyPath: "id",
                });
              }
            }
          };

          request.onsuccess = () => {
            const database = request.result;
            setDB(database);
            setIsDBConnecting(false);
          };

          request.onerror = () => {
            setDB(null);
            setIsDBConnecting(false);
          };
        }
      } catch (error) {
        console.error("Error initializing IndexedDB:", error);
        setIsDBConnecting(false);
      }
    };

    initDB();
  }, [databaseName, tableNames]);

  const getValue = useCallback(
    (tableName: string, id: number) => {
      return new Promise<any>((resolve, reject) => {
        if (!db) return null;
        const tx = db.transaction(tableName, "readonly");
        const store = tx.objectStore(tableName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (error) => reject(error);
      });
    },
    [db]
  );

  const getAllValue = async (tableName: string) => {
    if (!db) return [];
    const tx = db.transaction(tableName, "readonly");
    const store = tx.objectStore(tableName);
    const request = store.getAll();

    return new Promise<any[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = (error) => reject(error);
    });
  };

  const putValue = (tableName: string, value: object) => {
    if (!db) return null;
    const tx = db.transaction(tableName, "readwrite");
    const store = tx.objectStore(tableName);
    const request = store.put(value);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = (error) => reject(error);
    });
  };

  const putBulkValue = (tableName: string, values: object[]) => {
    if (!db) return [];
    const tx = db.transaction(tableName, "readwrite");
    const store = tx.objectStore(tableName);
    for (const value of values) {
      store.put(value);
    }

    return getAllValue(tableName);
  };

  const updateValue = ({
    tableName,
    id,
    newItem,
  }: {
    tableName: string;
    id: number;
    newItem: any;
  }) => {
    if (!db) return null;
    const tx = db.transaction(tableName, "readwrite");
    const store = tx.objectStore(tableName);
    const request = store.get(id);

    request.onsuccess = () => {
      const data = request.result;
      if (data) {
        const list = data.itemList ?? [];
        list.push(newItem);
        store.put({ ...data, itemList: list });
      } else {
        store.put({ id, itemList: [newItem] });
      }
    };
  };

  const updateDBValue = (tableName: string, id: number, newValue: any) => {
    if (!db) return null;
    const tx = db.transaction(tableName, "readwrite");
    const store = tx.objectStore(tableName);
    const request = store.get(id);

    request.onsuccess = () => {
      const data = request.result;
      if (data) {
        store.put({ ...data, ...newValue });
      } else {
        store.put({ id, ...newValue });
      }
    };
  };

  const deleteValue = (tableName: string, id: number) => {
    if (!db) return null;
    const tx = db.transaction(tableName, "readwrite");
    const store = tx.objectStore(tableName);
    store.delete(id);

    return id;
  };

  const deleteAll = (tableName: string) => {
    if (!db) return null;
    const tx = db.transaction(tableName, "readwrite");
    const store = tx.objectStore(tableName);
    store.clear();
  };

  return {
    getValue,
    getAllValue,
    putValue,
    putBulkValue,
    deleteValue,
    updateValue,
    isDBConnecting,
    updateDBValue,
    deleteAll,
  };
};
