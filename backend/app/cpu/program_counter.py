"""
program_counter.py - Program Counter (PC) Implementation for NEXUS
Milestone: Program Counter (PC) v0.1

This module provides the ProgramCounter class, which keeps track
of the memory address of the next instruction to execute in our simulated CPU.
"""


class ProgramCounter:
    """
    Simulates the Program Counter (PC) of a CPU.

    In computer architecture, the Program Counter (also known as the Instruction
    Pointer) is a dedicated register that holds the memory address of the next
    instruction waiting to be fetched and executed.
    """

    def __init__(self, initial_address: int = 0):
        """
        Initialize the Program Counter.

        By default, the counter begins at memory address 0.

        Args:
            initial_address (int, optional): Starting address for the PC. Defaults to 0.

        Raises:
            TypeError: If initial_address is not an integer.
            ValueError: If initial_address is negative.
        """
        # Validate that the initial address is a valid non-negative integer
        if not isinstance(initial_address, int) or isinstance(initial_address, bool):
            raise TypeError("Initial address must be an integer.")
        if initial_address < 0:
            raise ValueError("Initial address cannot be negative.")

        # Store the current address in an internal attribute
        self.current_address = initial_address

    def get(self) -> int:
        """
        Return the current memory address held in the Program Counter.

        Returns:
            int: The current address value.
        """
        return self.current_address

    def increment(self):
        """
        Advance the Program Counter to the next sequential instruction by adding 1.
        """
        self.current_address += 1

    def jump(self, address: int):
        """
        Change the Program Counter to point to a specified target address.
        This simulates branching or jumping to a different location in memory.

        Args:
            address (int): The target non-negative memory address.

        Raises:
            TypeError: If the address is not an integer.
            ValueError: If the address is negative.
        """
        # Ensure the address is an integer and not a boolean (bool is a subclass of int in Python)
        if not isinstance(address, int) or isinstance(address, bool):
            raise TypeError(f"Address must be an integer, got {type(address).__name__}.")

        # Ensure the address is not negative
        if address < 0:
            raise ValueError(f"Address cannot be negative: {address}")

        # Update the Program Counter to the target address
        self.current_address = address

    def reset(self):
        """
        Reset the Program Counter back to address 0.
        """
        self.current_address = 0
