"""
test_registers.py - Unit Tests for CPU Register System
Milestone: CPU Register System v0.1

Uses Python's built-in unittest framework to verify RegisterFile behavior.
"""

import os
import sys
import unittest

# Add backend directory to sys.path so 'app.cpu.registers' can be imported
# regardless of where the test command is executed.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.cpu.registers import RegisterFile


class TestRegisterFile(unittest.TestCase):
    """
    Test suite for verifying the RegisterFile class.
    """

    def setUp(self):
        """
        setUp runs before every single test method.
        It provides a fresh instance of RegisterFile for clean, isolated tests.
        """
        self.rf = RegisterFile()

    def test_initialization_all_zeros(self):
        """
        Test that all registers (R1, R2, R3, R4) are initialized with value 0.
        """
        expected_registers = {"R1": 0, "R2": 0, "R3": 0, "R4": 0}
        self.assertEqual(self.rf.registers, expected_registers)

        # Also verify via read() method
        for reg in ["R1", "R2", "R3", "R4"]:
            self.assertEqual(self.rf.read(reg), 0)

    def test_write_and_read_values(self):
        """
        Test that writing a value into a register and reading it back works as expected.
        """
        self.rf.write("R1", 42)
        self.rf.write("R2", 100)
        self.rf.write("R3", -5)
        self.rf.write("R4", 9999)

        self.assertEqual(self.rf.read("R1"), 42)
        self.assertEqual(self.rf.read("R2"), 100)
        self.assertEqual(self.rf.read("R3"), -5)
        self.assertEqual(self.rf.read("R4"), 9999)

    def test_overwrite_register_value(self):
        """
        Test that writing to an already written register updates its value.
        """
        self.rf.write("R1", 10)
        self.assertEqual(self.rf.read("R1"), 10)

        self.rf.write("R1", 25)
        self.assertEqual(self.rf.read("R1"), 25)

    def test_reset_restores_all_zeros(self):
        """
        Test that reset() restores all register values back to 0.
        """
        # First write values to multiple registers
        self.rf.write("R1", 15)
        self.rf.write("R2", 30)
        self.rf.write("R3", 45)
        self.rf.write("R4", 60)

        # Reset the register file
        self.rf.reset()

        # Check that every register is back to 0
        for reg in ["R1", "R2", "R3", "R4"]:
            self.assertEqual(self.rf.read(reg), 0)

    def test_invalid_register_write_raises_value_error(self):
        """
        Test that attempting to write to an invalid register name raises a ValueError.
        """
        with self.assertRaises(ValueError):
            self.rf.write("R5", 10)

        with self.assertRaises(ValueError):
            self.rf.write("INVALID", 100)

        with self.assertRaises(ValueError):
            self.rf.write("r1", 5)  # Case-sensitive check

    def test_invalid_register_read_raises_value_error(self):
        """
        Test that attempting to read from an invalid register name raises a ValueError.
        """
        with self.assertRaises(ValueError):
            self.rf.read("R5")

        with self.assertRaises(ValueError):
            self.rf.read("XYZ")


if __name__ == "__main__":
    unittest.main()
