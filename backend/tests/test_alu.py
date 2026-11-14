"""
test_alu.py - Unit Tests for Arithmetic Logic Unit (ALU)
Milestone: Arithmetic Logic Unit (ALU) v0.1

Uses Python's built-in unittest framework to verify ALU behavior.
"""

import os
import sys
import unittest

# Add backend directory to sys.path so 'app.cpu.alu' can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.cpu.alu import ALU


class TestALU(unittest.TestCase):
    """
    Test suite for verifying the ALU class.
    """

    def setUp(self):
        """
        setUp runs before every test, providing a fresh ALU instance.
        """
        self.alu = ALU()

    def test_addition(self):
        """
        Test ADD operation with positive, negative, and zero values.
        """
        self.assertEqual(self.alu.execute("ADD", 5, 3), 8)
        self.assertEqual(self.alu.execute("ADD", -5, 3), -2)
        self.assertEqual(self.alu.execute("ADD", 0, 0), 0)
        self.assertEqual(self.alu.execute("add", 10, 20), 30)  # Case-insensitivity

    def test_subtraction(self):
        """
        Test SUB operation.
        """
        self.assertEqual(self.alu.execute("SUB", 10, 4), 6)
        self.assertEqual(self.alu.execute("SUB", 4, 10), -6)
        self.assertEqual(self.alu.execute("SUB", 7, 7), 0)

    def test_multiplication(self):
        """
        Test MUL operation.
        """
        self.assertEqual(self.alu.execute("MUL", 6, 7), 42)
        self.assertEqual(self.alu.execute("MUL", -4, 5), -20)
        self.assertEqual(self.alu.execute("MUL", 99, 0), 0)

    def test_integer_division(self):
        """
        Test DIV operation using Python integer floor division (//).
        """
        self.assertEqual(self.alu.execute("DIV", 10, 2), 5)
        self.assertEqual(self.alu.execute("DIV", 7, 2), 3)  # Truncates fractional part
        self.assertEqual(self.alu.execute("DIV", 1, 3), 0)
        self.assertEqual(self.alu.execute("DIV", -7, 2), -4)

    def test_division_by_zero(self):
        """
        Test that DIV by zero raises ZeroDivisionError.
        """
        with self.assertRaises(ZeroDivisionError):
            self.alu.execute("DIV", 10, 0)

        with self.assertRaises(ZeroDivisionError):
            self.alu.execute("DIV", 0, 0)

    def test_bitwise_and(self):
        """
        Test bitwise AND operation.
        Example: 12 (1100) AND 10 (1010) = 8 (1000)
        """
        self.assertEqual(self.alu.execute("AND", 12, 10), 8)
        self.assertEqual(self.alu.execute("AND", 0xFF, 0x0F), 0x0F)
        self.assertEqual(self.alu.execute("AND", 15, 0), 0)

    def test_bitwise_or(self):
        """
        Test bitwise OR operation.
        Example: 12 (1100) OR 10 (1010) = 14 (1110)
        """
        self.assertEqual(self.alu.execute("OR", 12, 10), 14)
        self.assertEqual(self.alu.execute("OR", 0, 0), 0)
        self.assertEqual(self.alu.execute("OR", 1, 2), 3)

    def test_bitwise_xor(self):
        """
        Test bitwise XOR operation.
        Example: 12 (1100) XOR 10 (1010) = 6 (0110)
        """
        self.assertEqual(self.alu.execute("XOR", 12, 10), 6)
        self.assertEqual(self.alu.execute("XOR", 5, 5), 0)
        self.assertEqual(self.alu.execute("XOR", 0, 7), 7)

    def test_bitwise_not(self):
        """
        Test bitwise NOT operation (unary).
        In two's complement, ~x == -(x + 1).
        """
        self.assertEqual(self.alu.execute("NOT", 0), -1)
        self.assertEqual(self.alu.execute("NOT", 5), -6)
        self.assertEqual(self.alu.execute("NOT", -1), 0)

    def test_invalid_opcode(self):
        """
        Test that unsupported or invalid opcodes raise ValueError.
        """
        with self.assertRaises(ValueError):
            self.alu.execute("MOD", 10, 3)

        with self.assertRaises(ValueError):
            self.alu.execute("POW", 2, 3)

        with self.assertRaises(ValueError):
            self.alu.execute("", 1, 2)

    def test_invalid_operand_types(self):
        """
        Test that non-integer operands (floats, strings, None, and booleans) raise TypeError.
        """
        # Floats
        with self.assertRaises(TypeError):
            self.alu.execute("ADD", 5.5, 2)

        with self.assertRaises(TypeError):
            self.alu.execute("ADD", 5, 2.5)

        # Strings
        with self.assertRaises(TypeError):
            self.alu.execute("ADD", "10", 2)

        # Booleans (must be rejected even though bool inherits from int)
        with self.assertRaises(TypeError):
            self.alu.execute("ADD", True, 2)

        with self.assertRaises(TypeError):
            self.alu.execute("ADD", 5, False)

        with self.assertRaises(TypeError):
            self.alu.execute("NOT", True)

        # Non-string opcode
        with self.assertRaises(TypeError):
            self.alu.execute(123, 1, 2)

    def test_missing_operands(self):
        """
        Test that binary operations called without operand2 raise ValueError.
        """
        for op in ["ADD", "SUB", "MUL", "DIV", "AND", "OR", "XOR"]:
            with self.subTest(op=op):
                with self.assertRaises(ValueError):
                    self.alu.execute(op, 10)

    def test_unexpected_extra_operands(self):
        """
        Test that unary operations (NOT) called with an extra operand raise ValueError.
        """
        with self.assertRaises(ValueError):
            self.alu.execute("NOT", 5, 10)


if __name__ == "__main__":
    unittest.main()
