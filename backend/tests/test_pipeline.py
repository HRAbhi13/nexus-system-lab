"""
test_pipeline.py - Unit Tests for Fetch-Decode-Execute Pipeline
Milestone: Fetch-Decode-Execute Pipeline v0.1

Uses Python's built-in unittest framework to verify FetchDecodeExecutePipeline behavior.
"""

import os
import sys
import unittest

# Add backend directory to sys.path so 'app.cpu.*' can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.cpu.pipeline import FetchDecodeExecutePipeline
from app.cpu.execution_engine import CPU
from app.cpu.instruction import Instruction


class TestFetchDecodeExecutePipeline(unittest.TestCase):
    """
    Test suite for verifying the FetchDecodeExecutePipeline class.
    """

    def setUp(self):
        """
        setUp runs before every test method, creating a fresh pipeline.
        """
        self.pipeline = FetchDecodeExecutePipeline()

    def test_pipeline_initialization(self):
        """
        1. Test Pipeline initialization.
        """
        self.assertIsInstance(self.pipeline.cpu, CPU)
        self.assertEqual(self.pipeline.cycle_count, 0)
        self.assertEqual(self.pipeline.execution_history, [])
        self.assertEqual(self.pipeline.get_execution_history(), [])
        self.assertEqual(self.pipeline.current_stage, "IDLE")

        # Test initialization with custom CPU instance
        custom_cpu = CPU()
        custom_pipeline = FetchDecodeExecutePipeline(cpu=custom_cpu)
        self.assertIs(custom_pipeline.cpu, custom_cpu)

    def test_fetch_stage(self):
        """
        2. Test Fetch stage retrieves current instruction and updates state.
        """
        inst1 = Instruction("LOAD", ["R1", 10])
        inst2 = Instruction("HALT")
        self.pipeline.load_program([inst1, inst2])

        fetched = self.pipeline.fetch()
        self.assertEqual(fetched, inst1)
        self.assertEqual(self.pipeline.current_stage, "FETCH")
        self.assertEqual(self.pipeline.current_address, 0)

    def test_decode_stage(self):
        """
        3. Test Decode stage validates and structures instruction info.
        """
        inst = Instruction("LOAD", ["R1", 25])
        decoded = self.pipeline.decode(inst)

        self.assertEqual(decoded["opcode"], "LOAD")
        self.assertEqual(decoded["operands"], ("R1", 25))
        self.assertEqual(decoded["type"], "IMMEDIATE")
        self.assertEqual(self.pipeline.current_stage, "DECODE")

        # Decode without arguments should use last fetched instruction
        self.pipeline.load_program([inst])
        self.pipeline.fetch()
        decoded_auto = self.pipeline.decode()
        self.assertEqual(decoded_auto["opcode"], "LOAD")

    def test_execute_stage(self):
        """
        4. Test Execute stage updates registers and Program Counter via CPU.
        """
        inst = Instruction("LOAD", ["R1", 99])
        self.pipeline.load_program([inst])
        fetched = self.pipeline.fetch()
        decoded = self.pipeline.decode(fetched)

        result = self.pipeline.execute(decoded)
        self.assertIsNotNone(result)
        self.assertEqual(self.pipeline.cpu.registers.read("R1"), 99)
        self.assertEqual(self.pipeline.cpu.pc.get(), 1)
        self.assertEqual(self.pipeline.current_stage, "EXECUTE")

    def test_complete_instruction_cycle(self):
        """
        5. Test a complete instruction cycle via execute_cycle().
        """
        program = [Instruction("LOAD", ["R1", 100])]
        self.pipeline.load_program(program)

        cycle_result = self.pipeline.execute_cycle()
        self.assertEqual(cycle_result["cycle_number"], 1)
        self.assertEqual(cycle_result["instruction_address"], 0)
        self.assertEqual(cycle_result["opcode"], "LOAD")
        self.assertEqual(cycle_result["operands"], ("R1", 100))
        self.assertEqual(cycle_result["current_stage"], "EXECUTE")
        self.assertFalse(cycle_result["cpu_halted_status"])
        self.assertEqual(self.pipeline.cpu.registers.read("R1"), 100)
        self.assertEqual(self.pipeline.cpu.pc.get(), 1)

    def test_correct_program_counter_updates(self):
        """
        6. Test correct Program Counter updates across multiple stages.
        """
        program = [
            Instruction("LOAD", ["R1", 10]),
            Instruction("LOAD", ["R2", 20]),
            Instruction("HALT")
        ]
        self.pipeline.load_program(program)
        self.assertEqual(self.pipeline.cpu.pc.get(), 0)

        self.pipeline.execute_cycle()  # Cycle 1: LOAD R1, 10
        self.assertEqual(self.pipeline.cpu.pc.get(), 1)

        self.pipeline.execute_cycle()  # Cycle 2: LOAD R2, 20
        self.assertEqual(self.pipeline.cpu.pc.get(), 2)

        self.pipeline.execute_cycle()  # Cycle 3: HALT
        self.assertEqual(self.pipeline.cpu.pc.get(), 2)  # HALT does not advance PC

    def test_register_updates(self):
        """
        7. Test that register updates persist accurately.
        """
        program = [
            Instruction("LOAD", ["R1", 15]),
            Instruction("LOAD", ["R2", 30]),
            Instruction("ADD", ["R3", "R1", "R2"]),
            Instruction("HALT")
        ]
        self.pipeline.load_program(program)
        self.pipeline.run()

        self.assertEqual(self.pipeline.cpu.registers.read("R1"), 15)
        self.assertEqual(self.pipeline.cpu.registers.read("R2"), 30)
        self.assertEqual(self.pipeline.cpu.registers.read("R3"), 45)

    def test_multiple_instruction_cycles(self):
        """
        8. Test running multiple sequential instruction cycles.
        """
        program = [
            Instruction("LOAD", ["R1", 5]),
            Instruction("LOAD", ["R2", 10]),
            Instruction("HALT")
        ]
        self.pipeline.load_program(program)

        c1 = self.pipeline.execute_cycle()
        c2 = self.pipeline.execute_cycle()
        c3 = self.pipeline.execute_cycle()

        self.assertEqual(c1["cycle_number"], 1)
        self.assertEqual(c2["cycle_number"], 2)
        self.assertEqual(c3["cycle_number"], 3)
        self.assertEqual(self.pipeline.cycle_count, 3)

    def test_halt_handling(self):
        """
        9. Test HALT handling stops pipeline and forbids subsequent execution.
        """
        program = [
            Instruction("HALT"),
            Instruction("LOAD", ["R1", 10])
        ]
        self.pipeline.load_program(program)
        self.pipeline.execute_cycle()

        self.assertTrue(self.pipeline.cpu.halted)

        # Attempting execute_cycle after HALT must raise RuntimeError
        with self.assertRaises(RuntimeError):
            self.pipeline.execute_cycle()

        # Attempting fetch after HALT must raise RuntimeError
        with self.assertRaises(RuntimeError):
            self.pipeline.fetch()

    def test_execution_history(self):
        """
        10. Test execution history recording and immutability.
        """
        program = [
            Instruction("LOAD", ["R1", 1]),
            Instruction("LOAD", ["R2", 2]),
            Instruction("HALT")
        ]
        self.pipeline.load_program(program)
        self.pipeline.run()

        history = self.pipeline.get_execution_history()
        self.assertEqual(len(history), 3)
        self.assertEqual(history[0]["opcode"], "LOAD")
        self.assertEqual(history[1]["opcode"], "LOAD")
        self.assertEqual(history[2]["opcode"], "HALT")

        # Ensure returned history copy does not mutate internal pipeline history
        history.clear()
        self.assertEqual(len(self.pipeline.get_execution_history()), 3)

    def test_invalid_instruction_handling(self):
        """
        11. Test that invalid instructions or registers are rejected in decode.
        """
        # Unknown opcode
        invalid_op = Instruction("JUMP", ["R1"])
        with self.assertRaises(ValueError):
            self.pipeline.decode(invalid_op)

        # Invalid register name
        invalid_reg = Instruction("LOAD", ["R99", 5])
        with self.assertRaises(ValueError):
            self.pipeline.decode(invalid_reg)

        # Invalid operand count
        invalid_count = Instruction("ADD", ["R1", "R2"])
        with self.assertRaises(ValueError):
            self.pipeline.decode(invalid_count)

    def test_invalid_program_address(self):
        """
        12. Test fetching outside program memory bounds raises IndexError.
        """
        # Empty program
        self.pipeline.load_program([])
        with self.assertRaises(IndexError):
            self.pipeline.fetch()

        # Program with 1 instruction after it has finished
        self.pipeline.load_program([Instruction("LOAD", ["R1", 5])])
        self.pipeline.execute_cycle()
        with self.assertRaises(IndexError):
            self.pipeline.fetch()

    def test_running_complete_program(self):
        """
        13. Test running a complete program using run().
        """
        program = [
            Instruction("LOAD", ["R1", 10]),
            Instruction("LOAD", ["R2", 2]),
            Instruction("MUL", ["R3", "R1", "R2"]),  # 20
            Instruction("DIV", ["R4", "R3", "R2"]),  # 10
            Instruction("HALT")
        ]
        self.pipeline.load_program(program)
        history = self.pipeline.run()

        self.assertEqual(len(history), 5)
        self.assertTrue(self.pipeline.cpu.halted)
        self.assertEqual(self.pipeline.cpu.registers.read("R3"), 20)
        self.assertEqual(self.pipeline.cpu.registers.read("R4"), 10)

    def test_division_by_zero_handling(self):
        """
        14. Test that DIV by zero is propagated properly during pipeline cycle.
        """
        program = [
            Instruction("LOAD", ["R1", 50]),
            Instruction("LOAD", ["R2", 0]),
            Instruction("DIV", ["R3", "R1", "R2"]),
            Instruction("HALT")
        ]
        self.pipeline.load_program(program)
        self.pipeline.execute_cycle()  # LOAD R1, 50
        self.pipeline.execute_cycle()  # LOAD R2, 0

        with self.assertRaises(ZeroDivisionError):
            self.pipeline.execute_cycle()  # DIV R3, R1, R2


if __name__ == "__main__":
    unittest.main()
