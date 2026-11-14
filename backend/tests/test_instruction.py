"""
test_instruction.py - Unit Tests for CPU Instruction Representation
Milestone: Instruction Representation System v0.1

Uses Python's built-in unittest framework to verify Instruction behavior.
"""

import os
import sys
import unittest

# Add backend directory to sys.path so 'app.cpu.instruction' can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.cpu.instruction import Instruction


class TestInstruction(unittest.TestCase):
    """
    Test suite for verifying the Instruction class.
    """

    def test_create_load_instruction(self):
        """
        Case 1: Test creating a LOAD instruction with register and immediate value.
        """
        inst = Instruction("LOAD", ["R1", 10])
        self.assertEqual(inst.opcode, "LOAD")
        self.assertEqual(inst.operands, ("R1", 10))
        self.assertIsInstance(inst.operands, tuple)

    def test_create_add_instruction(self):
        """
        Case 2: Test creating an ADD instruction with multiple register operands.
        """
        inst = Instruction("ADD", ["R3", "R1", "R2"])
        self.assertEqual(inst.opcode, "ADD")
        self.assertEqual(inst.operands, ("R3", "R1", "R2"))
        self.assertIsInstance(inst.operands, tuple)

    def test_create_instruction_without_operands(self):
        """
        Case 3: Test creating an instruction without operands (e.g. HALT).
        """
        # When operands argument is omitted
        inst1 = Instruction("HALT")
        self.assertEqual(inst1.opcode, "HALT")
        self.assertEqual(inst1.operands, ())

        # When operands is passed as None
        inst2 = Instruction("NOP", None)
        self.assertEqual(inst2.opcode, "NOP")
        self.assertEqual(inst2.operands, ())

        # When operands is passed as empty list
        inst3 = Instruction("RET", [])
        self.assertEqual(inst3.opcode, "RET")
        self.assertEqual(inst3.operands, ())

    def test_automatic_uppercase_conversion(self):
        """
        Case 4: Test that opcodes are automatically converted to uppercase.
        """
        inst_lower = Instruction("load", ["R1", 5])
        self.assertEqual(inst_lower.opcode, "LOAD")

        inst_mixed = Instruction("Sub", ["R1", "R2"])
        self.assertEqual(inst_mixed.opcode, "SUB")

    def test_removal_of_unnecessary_whitespace(self):
        """
        Case 5: Test that leading/trailing whitespace is trimmed from opcode and string operands.
        """
        inst = Instruction("   JUMP   ", ["   LABEL1   "])
        self.assertEqual(inst.opcode, "JUMP")
        self.assertEqual(inst.operands, ("LABEL1",))

    def test_invalid_or_empty_opcode_rejection(self):
        """
        Case 6: Test that empty, whitespace-only, or non-string opcodes are rejected.
        """
        # Non-string opcodes
        with self.assertRaises(TypeError):
            Instruction(123)

        with self.assertRaises(TypeError):
            Instruction(None)

        # Empty string
        with self.assertRaises(ValueError):
            Instruction("")

        # Whitespace-only string
        with self.assertRaises(ValueError):
            Instruction("   ")

    def test_invalid_operand_container_rejection(self):
        """
        Case 7: Test that passing invalid operand containers raises TypeError.
        """
        # Passing an integer instead of a list/tuple
        with self.assertRaises(TypeError):
            Instruction("LOAD", 10)

        # Passing a string instead of a list/tuple
        with self.assertRaises(TypeError):
            Instruction("LOAD", "R1")

        # Passing a dict instead of a list/tuple
        with self.assertRaises(TypeError):
            Instruction("LOAD", {"reg": "R1"})

    def test_correct_string_representation(self):
        """
        Case 8: Test that __str__() produces clean assembly-style representation.
        """
        load_inst = Instruction("LOAD", ["R1", 10])
        self.assertEqual(str(load_inst), "LOAD R1, 10")

        add_inst = Instruction("ADD", ["R3", "R1", "R2"])
        self.assertEqual(str(add_inst), "ADD R3, R1, R2")

        halt_inst = Instruction("HALT")
        self.assertEqual(str(halt_inst), "HALT")

        # Test equality and repr
        self.assertEqual(repr(halt_inst), "Instruction('HALT', [])")
        self.assertEqual(load_inst, Instruction("load", ["R1", 10]))


if __name__ == "__main__":
    unittest.main()
