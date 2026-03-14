"use client";

export const getConnectionString = (): string => {
  const connectionString = window.localStorage.getItem("connectionString");

  if (connectionString) {
    return connectionString;
  }

  const newConnectionString = generateConnectionString();
  window.localStorage.setItem("connectionString", newConnectionString);

  return newConnectionString;
};

/**
 * Generates a random string.
 * @returns {string}
 */
export const generateConnectionString = () => {
  return Math.random().toString(36).substring(2, 15);
};
