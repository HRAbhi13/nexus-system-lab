"""
test_execution_engine.py - Unit Tests for CPU Execution Engine
Milestone: CPU Instruction Execution Engine v0.1

Uses Python's built-in unittest framework to verify CPU behavior.
"""

import os
import sys
import unittest

# Add backend directory to sys.path so 'app.cpu.*' can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.cpu.execution_engine import CPU
from app.cpu.instruction import Instruction
from app.cpu.registers import RegisterFile
from app.cpu.program_counter import ProgramCounter
from app.cpu.alu import ALU


class TestExecutionEngine(unittest.TestCase):
    """
    Test suite for verifying the CPU execution engine.
    """

    def setUp(self):
        """
        setUp runs before every test method, providing a fresh CPU instance.
        """
        self.cpu = CPU()

    def test_cpu_initialization(self):
        """
        1. Test CPU initialization.
        """
        self.assertIsInstance(self.cpu.registers, RegisterFile)
        self.assertIsInstance(self.cpu.pc, ProgramCounter)
        self.assertIsInstance(self.cpu.alu, ALU)
        self.assertEqual(self.cpu.instructions, [])
        self.assertFalse(self.cpu.halted)
        self.assertEqual(self.cpu.pc.get(), 0)

    def test_program_loading(self):
        """
        2. Test program loading and rejection of invalid program inputs.
        """
        program = [
            Instruction("LOAD", ["R1", 10]),
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        self.assertEqual(len(self.cpu.instructions), 2)
        self.assertFalse(self.cpu.halted)
        self.assertEqual(self.cpu.pc.get(), 0)

        # Reject non-list/tuple
        with self.assertRaises(TypeError):
            self.cpu.load_program("NOT_A_PROGRAM")

        # Reject lists containing non-Instruction items
        with self.assertRaises(TypeError):
            self.cpu.load_program([Instruction("HALT"), "invalid_instruction"])

    def test_load_instruction(self):
        """
        3. Test LOAD destination_register, immediate_value.
        """
        program = [
            Instruction("LOAD", ["R1", 42]),
            Instruction("LOAD", ["R2", -10]),
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        self.cpu.step()
        self.assertEqual(self.cpu.registers.read("R1"), 42)
        self.cpu.step()
        self.assertEqual(self.cpu.registers.read("R2"), -10)

    def test_add_instruction(self):
        """
        4. Test ADD destination_register, source1, source2.
        """
        program = [
            Instruction("LOAD", ["R1", 15]),
            Instruction("LOAD", ["R2", 25]),
            Instruction("ADD", ["R3", "R1", "R2"]),
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        self.cpu.step()  # LOAD R1, 15
        self.cpu.step()  # LOAD R2, 25
        self.cpu.step()  # ADD R3, R1, R2
        self.assertEqual(self.cpu.registers.read("R3"), 40)

    def test_sub_instruction(self):
        """
        5. Test SUB destination_register, source1, source2.
        """
        program = [
            Instruction("LOAD", ["R1", 50]),
            Instruction("LOAD", ["R2", 20]),
            Instruction("SUB", ["R3", "R1", "R2"]),
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        self.cpu.step()
        self.cpu.step()
        self.cpu.step()
        self.assertEqual(self.cpu.registers.read("R3"), 30)

    def test_mul_instruction(self):
        """
        6. Test MUL destination_register, source1, source2.
        """
        program = [
            Instruction("LOAD", ["R1", 6]),
            Instruction("LOAD", ["R2", 7]),
            Instruction("MUL", ["R3", "R1", "R2"]),
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        self.cpu.step()
        self.cpu.step()
        self.cpu.step()
        self.assertEqual(self.cpu.registers.read("R3"), 42)

    def test_div_instruction(self):
        """
        7. Test DIV destination_register, source1, source2 (integer floor division).
        """
        program = [
            Instruction("LOAD", ["R1", 20]),
            Instruction("LOAD", ["R2", 3]),
            Instruction("DIV", ["R3", "R1", "R2"]),
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        self.cpu.step()
        self.cpu.step()
        self.cpu.step()
        self.assertEqual(self.cpu.registers.read("R3"), 6)

    def test_and_instruction(self):
        """
        8. Test AND destination_register, source1, source2.
        """
        program = [
            Instruction("LOAD", ["R1", 12]),  # 1100
            Instruction("LOAD", ["R2", 10]),  # 1010
            Instruction("AND", ["R3", "R1", "R2"]),
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        self.cpu.step()
        self.cpu.step()
        self.cpu.step()
        self.assertEqual(self.cpu.registers.read("R3"), 8)  # 1000

    def test_or_instruction(self):
        """
        9. Test OR destination_register, source1, source2.
        """
        program = [
            Instruction("LOAD", ["R1", 12]),  # 1100
            Instruction("LOAD", ["R2", 10]),  # 1010
            Instruction("OR", ["R3", "R1", "R2"]),
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        self.cpu.step()
        self.cpu.step()
        self.cpu.step()
        self.assertEqual(self.cpu.registers.read("R3"), 14)  # 1110

    def test_xor_instruction(self):
        """
        10. Test XOR destination_register, source1, source2.
        """
        program = [
            Instruction("LOAD", ["R1", 12]),  # 1100
            Instruction("LOAD", ["R2", 10]),  # 1010
            Instruction("XOR", ["R3", "R1", "R2"]),
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        self.cpu.step()
        self.cpu.step()
        self.cpu.step()
        self.assertEqual(self.cpu.registers.read("R3"), 6)  # 0110

    def test_not_instruction(self):
        """
        11. Test NOT destination_register, source_register.
        """
        program = [
            Instruction("LOAD", ["R1", 5]),
            Instruction("NOT", ["R2", "R1"]),
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        self.cpu.step()
        self.cpu.step()
        self.assertEqual(self.cpu.registers.read("R2"), -6)

    def test_halt_instruction(self):
        """
        12. Test HALT instruction stops execution and sets halted status to True.
        """
        program = [
            Instruction("LOAD", ["R1", 1]),
            Instruction("HALT"),
            Instruction("LOAD", ["R1", 999])
        ]
        self.cpu.load_program(program)
        self.cpu.step()  # PC = 1
        self.assertFalse(self.cpu.halted)
        self.cpu.step()  # executes HALT
        self.assertTrue(self.cpu.halted)
        self.assertEqual(self.cpu.pc.get(), 1)  # HALT does not advance PC

    def test_program_counter_advancement(self):
        """
        13. Test Program Counter advances by 1 after each non-HALT instruction.
        """
        program = [
            Instruction("LOAD", ["R1", 10]),
            Instruction("LOAD", ["R2", 20]),
            Instruction("LOAD", ["R3", 30]),
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        self.assertEqual(self.cpu.pc.get(), 0)
        self.cpu.step()
        self.assertEqual(self.cpu.pc.get(), 1)
        self.cpu.step()
        self.assertEqual(self.cpu.pc.get(), 2)
        self.cpu.step()
        self.assertEqual(self.cpu.pc.get(), 3)

    def test_multiple_instructions_in_sequence(self):
        """
        14. Test multiple instructions executed in sequence.
        """
        program = [
            Instruction("LOAD", ["R1", 10]),
            Instruction("LOAD", ["R2", 5]),
            Instruction("ADD", ["R3", "R1", "R2"]),  # R3 = 15
            Instruction("SUB", ["R4", "R3", "R2"]),  # R4 = 10
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        for _ in range(5):
            self.cpu.step()

        self.assertEqual(self.cpu.registers.read("R1"), 10)
        self.assertEqual(self.cpu.registers.read("R2"), 5)
        self.assertEqual(self.cpu.registers.read("R3"), 15)
        self.assertEqual(self.cpu.registers.read("R4"), 10)
        self.assertTrue(self.cpu.halted)

    def test_invalid_register_handling(self):
        """
        15. Test that invalid register names raise ValueError.
        """
        program = [Instruction("LOAD", ["R99", 10])]
        self.cpu.load_program(program)
        with self.assertRaises(ValueError):
            self.cpu.step()

        program_src = [
            Instruction("LOAD", ["R1", 5]),
            Instruction("ADD", ["R1", "INVALID_REG", "R1"])
        ]
        self.cpu.load_program(program_src)
        self.cpu.step()
        with self.assertRaises(ValueError):
            self.cpu.step()

    def test_invalid_opcode_handling(self):
        """
        16. Test that unsupported opcodes raise ValueError.
        """
        program = [Instruction("UNKNOWN_OP", ["R1", 10])]
        self.cpu.load_program(program)
        with self.assertRaises(ValueError):
            self.cpu.step()

    def test_invalid_operand_count(self):
        """
        17. Test that incorrect number of operands raises ValueError.
        """
        # LOAD with 1 operand instead of 2
        program1 = [Instruction("LOAD", ["R1"])]
        self.cpu.load_program(program1)
        with self.assertRaises(ValueError):
            self.cpu.step()

        # ADD with 2 operands instead of 3
        program2 = [Instruction("ADD", ["R1", "R2"])]
        self.cpu.load_program(program2)
        with self.assertRaises(ValueError):
            self.cpu.step()

        # NOT with 1 operand instead of 2
        program3 = [Instruction("NOT", ["R1"])]
        self.cpu.load_program(program3)
        with self.assertRaises(ValueError):
            self.cpu.step()

        # HALT with an operand
        program4 = [Instruction("HALT", [100])]
        self.cpu.load_program(program4)
        with self.assertRaises(ValueError):
            self.cpu.step()

    def test_division_by_zero(self):
        """
        18. Test that DIV by a register containing 0 raises ZeroDivisionError.
        """
        program = [
            Instruction("LOAD", ["R1", 100]),
            Instruction("LOAD", ["R2", 0]),
            Instruction("DIV", ["R3", "R1", "R2"]),
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        self.cpu.step()
        self.cpu.step()
        with self.assertRaises(ZeroDivisionError):
            self.cpu.step()

    def test_attempting_execution_after_halt(self):
        """
        19. Test that attempting step() after HALT raises RuntimeError.
        """
        program = [
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        self.cpu.step()  # CPU halts
        self.assertTrue(self.cpu.halted)

        with self.assertRaises(RuntimeError):
            self.cpu.step()

    def test_running_complete_program(self):
        """
        20. Test running a complete multi-step program using run().
        """
        program = [
            Instruction("LOAD", ["R1", 8]),
            Instruction("LOAD", ["R2", 4]),
            Instruction("MUL", ["R3", "R1", "R2"]),  # R3 = 32
            Instruction("DIV", ["R4", "R3", "R2"]),  # R4 = 8
            Instruction("HALT")
        ]
        self.cpu.load_program(program)
        final_state = self.cpu.run()

        self.assertTrue(final_state["halted"])
        self.assertTrue(self.cpu.halted)
        self.assertEqual(final_state["registers"]["R1"], 8)
        self.assertEqual(final_state["registers"]["R2"], 4)
        self.assertEqual(final_state["registers"]["R3"], 32)
        self.assertEqual(final_state["registers"]["R4"], 8)


if __name__ == "__main__":
    unittest.main()
