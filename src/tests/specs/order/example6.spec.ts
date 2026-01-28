import { test, expect } from '@playwright/test';
import { example6 } from '../src/example6'; // Adjust the import path based on your project structure

test.describe('Feature: Order - example6 Function Tests', () => {

  // TC001: Successful Execution and Expected Output
  test('TC001: Successful Execution and Expected Output - should return success: true and the correct message', () => {
    const result = example6();
    expect(result.success).toBe(true);
    expect(result.message).toBe("Example6 function executed successfully");
  });

  // TC002: Correct Object Structure
  test('TC002: Correct Object Structure - should return an object with exactly "success" and "message" properties', () => {
    const result = example6();
    expect(Object.keys(result).length).toBe(2);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    // Ensure no other unexpected properties exist
    expect(result).toEqual({
      success: expect.any(Boolean),
      message: expect.any(String),
    });
  });

  // TC003: Deterministic Output
  test('TC003: Deterministic Output - repeated calls should consistently return the exact same output object', () => {
    const result1 = example6();
    const result2 = example6();
    expect(result1).toEqual(result2); // Deep equality check
  });

  // TC004: No Unhandled Exceptions
  test('TC004: No Unhandled Exceptions - should not throw any unhandled exceptions during execution', () => {
    // This assertion checks that the function execution doesn't throw an error.
    expect(() => example6()).not.toThrow();
  });

  // TC005: No Unexpected Data Types or Values
  test('TC005: No Unexpected Data Types or Values - should return a valid object with expected data types and values', () => {
    const result = example6();

    // Verify it's an object and not null/array
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(false);

    // Verify property types and values
    expect(typeof result.success).toBe('boolean');
    expect(result.success).toBe(true); // Specific value check as per TC description

    expect(typeof result.message).toBe('string');
    expect(result.message).not.toBe(''); // Message should not be empty
    expect(result.message).toBe("Example6 function executed successfully"); // Specific message check

    // Ensure properties are not undefined
    expect(result.success).not.toBeUndefined();
    expect(result.message).not.toBeUndefined();
  });
});