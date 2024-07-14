/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useState } from "react";
import { Database } from "utils/constants";

// Interface defining the return type for useIndexedDB hook
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
  deleteValue: (tableName: string, id: number) => number | null;
  deleteAll: (tableName: string) => void;
  isDBConnecting: boolean;
}

export const useIndexedDB = (
  databaseName: string,
  tableNames: string[]
): UseIndexedDBResult => {
  const [db, setDB] = useState<IDBDatabase | null>(null);
  const [isDBConnecting, setIsDBConnecting] = useState<boolean>(true);

  useEffect(() => {
    const initDB = () => {
      const request = indexedDB.open(databaseName, Database.version);

      // Handle database upgrade
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

      // Handle successful database connection
      request.onsuccess = () => {
        setDB(request.result);
        setIsDBConnecting(false);
      };

      // Handle errors in database connection
      request.onerror = () => {
        console.error("Error initializing IndexedDB:", request.error);
        setIsDBConnecting(false);
      };
    };

    if (!db) {
      initDB();
    }
  }, [databaseName, tableNames, db]);

  // Helper function to get a transaction for a specific table
  const getTransaction = (tableName: string, mode: IDBTransactionMode) => {
    if (!db) throw new Error("Database is not initialized");
    return db.transaction(tableName, mode).objectStore(tableName);
  };

  // Function to get a specific value from the table by ID
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

  // Function to get all values from a specific table
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

  // Function to insert or update a single value in a specific table
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

  // Function to insert or update multiple values in a specific table
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

  // Function to update a specific value by ID in a specific table
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

  // Function to delete a specific value by ID from a specific table
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

  // Function to delete all values from a specific table
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
    deleteValue,
    deleteAll,
    isDBConnecting,
  };
};
