"""
test_program_counter.py - Unit Tests for Program Counter (PC)
Milestone: Program Counter (PC) v0.1

Uses Python's built-in unittest framework to verify ProgramCounter behavior.
"""

import os
import sys
import unittest

# Add backend directory to sys.path so 'app.cpu.program_counter' can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.cpu.program_counter import ProgramCounter


class TestProgramCounter(unittest.TestCase):
    """
    Test suite for verifying the ProgramCounter class.
    """

    def setUp(self):
        """
        setUp runs before every test method, providing a fresh ProgramCounter instance.
        """
        self.pc = ProgramCounter()

    def test_initialization_defaults_to_zero(self):
        """
        Case 1: Test that PC initializes to 0 by default.
        """
        self.assertEqual(self.pc.get(), 0)

    def test_get_returns_correct_value(self):
        """
        Case 2: Test that get() returns the current PC value accurately.
        """
        self.assertEqual(self.pc.get(), 0)
        custom_pc = ProgramCounter(initial_address=15)
        self.assertEqual(custom_pc.get(), 15)

    def test_increment_increases_by_one(self):
        """
        Case 3: Test that increment() increases PC by exactly 1.
        """
        self.pc.increment()
        self.assertEqual(self.pc.get(), 1)

    def test_multiple_increments(self):
        """
        Case 4: Test that calling increment() multiple times advances PC sequentially.
        """
        for expected in range(1, 6):
            self.pc.increment()
            self.assertEqual(self.pc.get(), expected)

    def test_jump_changes_address(self):
        """
        Case 5: Test that jump() changes PC to the specified address.
        """
        self.pc.jump(42)
        self.assertEqual(self.pc.get(), 42)

        self.pc.jump(100)
        self.assertEqual(self.pc.get(), 100)

        # Jumping to address 0 should also be valid
        self.pc.jump(0)
        self.assertEqual(self.pc.get(), 0)

    def test_reset_restores_zero(self):
        """
        Case 6: Test that reset() restores PC to 0 from any address.
        """
        self.pc.jump(88)
        self.assertEqual(self.pc.get(), 88)

        self.pc.reset()
        self.assertEqual(self.pc.get(), 0)

    def test_negative_jump_addresses_rejected(self):
        """
        Case 7: Test that negative jump addresses raise ValueError.
        """
        with self.assertRaises(ValueError):
            self.pc.jump(-1)

        with self.assertRaises(ValueError):
            self.pc.jump(-50)

    def test_invalid_address_types_rejected(self):
        """
        Case 8: Test that non-integer address types raise TypeError.
        """
        invalid_types = ["10", 3.14, None, [5], {"addr": 0}, True, False]
        for val in invalid_types:
            with self.subTest(val=val):
                with self.assertRaises(TypeError):
                    self.pc.jump(val)


if __name__ == "__main__":
    unittest.main()
