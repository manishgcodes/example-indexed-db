/* eslint-disable @typescript-eslint/no-explicit-any */

import { Database } from "utils/constants";
import { useCallback, useEffect, useState } from "react";

interface UseIndexedDBResult {
  getValue: (tableName: string, id: number) => Promise<any>;
  getAllValue: (tableName: string) => Promise<any[]>;
  putValue: (tableName: string, value: object) => Promise<IDBValidKey | null>;
  putBulkValue: (tableName: string, values: object[]) => Promise<any[]>;
  updateValue: (params: {
    tableName: string;
    id: number;
    newItem: any;
  }) => void;
  updateDBValue: (tableName: string, id: number, newValue: any) => void;
  deleteValue: (tableName: string, id: number) => number | null;
  deleteAll: (tableName: string) => void;
  isDBConnecting: boolean;
}

const useIndexedDB = (
  databaseName: string,
  tableNames: string[]
): UseIndexedDBResult => {
  const [db, setDB] = useState<IDBDatabase | null>(null);
  const [isDBConnecting, setIsDBConnecting] = useState<boolean>(true);

  useEffect(() => {
    const initDB = () => {
      const request = indexedDB.open(databaseName, Database.version);

      request.onupgradeneeded = () => {
        const database = request.result;
        tableNames.forEach((tableName) => {
          if (!database.objectStoreNames.contains(tableName)) {
            database.createObjectStore(tableName, {
              autoIncrement: true,
              keyPath: "id",
            });
          }
        });
      };

      request.onsuccess = () => {
        setDB(request.result);
        setIsDBConnecting(false);
      };

      request.onerror = () => {
        console.error("Error initializing IndexedDB:", request.error);
        setIsDBConnecting(false);
      };
    };

    if (!db) {
      initDB();
    }
  }, [databaseName, tableNames, db]);

  const getTransaction = (tableName: string, mode: IDBTransactionMode) => {
    if (!db) throw new Error("Database is not initialized");
    return db.transaction(tableName, mode).objectStore(tableName);
  };

  const getValue = useCallback(
    (tableName: string, id: number): Promise<any> => {
      return new Promise((resolve, reject) => {
        try {
          const store = getTransaction(tableName, "readonly");
          const request = store.get(id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } catch (error) {
          reject(error);
        }
      });
    },
    [db]
  );

  const getAllValue = (tableName: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      try {
        const store = getTransaction(tableName, "readonly");
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  };

  const putValue = (
    tableName: string,
    value: object
  ): Promise<IDBValidKey | null> => {
    return new Promise((resolve, reject) => {
      try {
        const store = getTransaction(tableName, "readwrite");
        const request = store.put(value);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  };

  const putBulkValue = async (
    tableName: string,
    values: object[]
  ): Promise<any[]> => {
    try {
      const store = getTransaction(tableName, "readwrite");
      values.forEach((value) => store.put(value));
      return getAllValue(tableName);
    } catch (error) {
      throw new Error("Bulk insert failed: " + error);
    }
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
    try {
      const store = getTransaction(tableName, "readwrite");
      const request = store.get(id);

      request.onsuccess = () => {
        const data = request.result;
        const updatedItem = data ? { ...data, ...newItem } : { id, newItem };
        store.put(updatedItem);
      };
    } catch (error) {
      console.error("Update value failed: ", error);
    }
  };

  const updateDBValue = (tableName: string, id: number, newValue: any) => {
    try {
      const store = getTransaction(tableName, "readwrite");
      const request = store.get(id);

      request.onsuccess = () => {
        const data = request.result;
        const updatedValue = data
          ? { ...data, ...newValue }
          : { id, ...newValue };
        store.put(updatedValue);
      };
    } catch (error) {
      console.error("Update DB value failed: ", error);
    }
  };

  const deleteValue = (tableName: string, id: number): number | null => {
    try {
      const store = getTransaction(tableName, "readwrite");
      store.delete(id);
      return id;
    } catch (error) {
      console.error("Delete value failed: ", error);
      return null;
    }
  };

  const deleteAll = (tableName: string) => {
    try {
      const store = getTransaction(tableName, "readwrite");
      store.clear();
    } catch (error) {
      console.error("Delete all values failed: ", error);
    }
  };

  return {
    getValue,
    getAllValue,
    putValue,
    putBulkValue,
    updateValue,
    updateDBValue,
    deleteValue,
    deleteAll,
    isDBConnecting,
  };
};

export default useIndexedDB;
