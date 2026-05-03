// Additional LLD problems not present in the main lldProblems.js

export const extraLldProblems = [
  {
    id: 'bloom-filter',
    title: 'Bloom Filter',
    subtitle: 'Probabilistic Data Structure',
    icon: 'filter',
    color: '#10b981',
    difficulty: 'Easy',
    description: 'Design a space-efficient probabilistic data structure that tests whether an element is a member of a set, allowing false positives but never false negatives.',

    introduction: `A Bloom Filter is a space-efficient probabilistic data structure used to test set membership. It can tell you with certainty that an element is NOT in the set, but can only say an element is PROBABLY in the set. This trade-off of allowing false positives for massive space savings makes it valuable for caching, spam detection, and database query optimization.

The structure uses a bit array of m bits, all initially set to 0, and k independent hash functions. To add an element, hash it with all k functions and set the corresponding bit positions to 1. To query, hash the element and check if ALL k positions are 1. If any bit is 0, the element is definitely not in the set. If all bits are 1, the element is probably in the set (the bits might have been set by different elements).`,

    coreEntities: [
      { name: 'BloomFilter', description: 'Main class managing the bit array and hash functions with add() and contains() operations' },
      { name: 'BitArray', description: 'Fixed-size array of bits with set() and get() operations' },
      { name: 'HashFunction', description: 'Interface for hash functions that map elements to bit positions' },
      { name: 'BloomFilterConfig', description: 'Configuration holding expected element count, desired false positive rate, and computed optimal m and k' }
    ],

    designPatterns: [
      'Strategy Pattern: Pluggable hash function families (Murmur, FNV, SHA-based)',
      'Builder Pattern: Configure filter parameters (expected elements, false positive rate) and compute optimal bit array size and hash count',
      'Facade Pattern: Simple add/contains interface hiding the multi-hash complexity'
    ],

    implementation: `import math
import mmh3  # MurmurHash3

class BloomFilter:
    def __init__(self, expected_elements: int, fp_rate: float = 0.01):
        self.size = self._optimal_size(expected_elements, fp_rate)
        self.hash_count = self._optimal_hash_count(self.size, expected_elements)
        self.bit_array = [False] * self.size
        self.count = 0

    def _optimal_size(self, n: int, p: float) -> int:
        """Optimal bit array size: m = -(n * ln(p)) / (ln(2)^2)"""
        m = -(n * math.log(p)) / (math.log(2) ** 2)
        return int(m)

    def _optimal_hash_count(self, m: int, n: int) -> int:
        """Optimal hash count: k = (m/n) * ln(2)"""
        k = (m / n) * math.log(2)
        return int(k)

    def _get_hash_positions(self, item: str) -> list:
        positions = []
        for i in range(self.hash_count):
            hash_val = mmh3.hash(item, seed=i) % self.size
            positions.append(abs(hash_val))
        return positions

    def add(self, item: str):
        for pos in self._get_hash_positions(item):
            self.bit_array[pos] = True
        self.count += 1

    def contains(self, item: str) -> bool:
        return all(self.bit_array[pos]
                   for pos in self._get_hash_positions(item))

    def estimated_fp_rate(self) -> float:
        """Current estimated false positive rate"""
        return (1 - math.exp(-self.hash_count * self.count / self.size)) ** self.hash_count`,

    keyQuestions: [
      {
        question: 'Why can a Bloom Filter have false positives but never false negatives?',
        answer: `A false negative would mean the filter says an element is absent when it was actually added. This is impossible because adding an element sets specific bits to 1, and bits are never reset to 0. Those bits will always be 1 for any future query of that element.

A false positive occurs when an element that was never added happens to have all its hash positions set to 1 by other elements. As the filter fills up, more bits are set, and the probability of all k positions being coincidentally set increases. The false positive rate is approximately (1 - e^(-kn/m))^k, where k is the number of hash functions, n is the number of elements, and m is the bit array size.`
      },
      {
        question: 'How do you choose the optimal size and number of hash functions?',
        answer: `Given n expected elements and a desired false positive rate p, the optimal bit array size is m = -(n * ln(p)) / (ln(2)^2), and the optimal number of hash functions is k = (m/n) * ln(2). For example, with 1 million elements and a 1% false positive rate: m is approximately 9.6 million bits (1.2 MB), and k is approximately 7 hash functions.

These formulas minimize the false positive rate for a given memory budget. Using too few hash functions increases false positives because each element sets fewer bits. Using too many hash functions also increases false positives because the bit array fills up faster. The optimal k balances these two effects.`
      },
      {
        question: 'What are common use cases for Bloom Filters?',
        answer: `Database query optimization: check if a row might exist before doing an expensive disk lookup. Google Bigtable, Apache Cassandra, and LevelDB all use Bloom Filters to avoid unnecessary disk reads. Web caching: check if a URL has been seen before adding it to the cache. Spam filtering: check if an email address is in a known-spammer set. Network routing: check if a packet matches any rule in a large rule set.

Content delivery networks use Bloom Filters to determine if content is cached locally before querying origin servers. Blockchain nodes use them to efficiently sync transactions without downloading the full blockchain. Chrome uses a Bloom Filter to check URLs against a list of known malicious sites before making a network request to verify.`
      }
    ],

    tips: [
      'Standard Bloom Filters do not support deletion; use Counting Bloom Filters (replace bits with counters) if you need delete capability',
      'The false positive rate increases as the filter fills up; monitor the fill ratio',
      'Use independent hash functions or derive them from a single hash with different seeds',
      'Bloom Filters are excellent for "definitely not in set" checks that guard expensive operations',
      'Size the filter for your expected maximum element count; resizing requires rehashing all elements'
    ]
  },
  {
    id: 'search-autocomplete',
    title: 'Search Autocomplete',
    subtitle: 'Typeahead Suggestion System',
    icon: 'search',
    color: '#3b82f6',
    difficulty: 'Easy',
    description: 'Design a search autocomplete system that suggests relevant completions as the user types.',

    introduction: `A search autocomplete system provides real-time suggestions as users type queries. It must balance speed (suggestions appear within 100ms), relevance (popular and recent queries rank higher), and resource efficiency (serve millions of concurrent users with minimal latency).

The core data structure is a Trie (prefix tree) where each node represents a character. Traversing from the root to a node spells out a prefix. Each node stores references to top suggestions for that prefix, enabling O(prefix length) lookups instead of scanning all possible completions.`,

    coreEntities: [
      { name: 'TrieNode', description: 'Node in the trie with children map, boolean isEndOfWord, and top-k suggestions list' },
      { name: 'AutocompleteTrie', description: 'Trie data structure with insert, search, and getSuggestions operations' },
      { name: 'SuggestionRanker', description: 'Ranks suggestions by frequency, recency, and personalization signals' },
      { name: 'QueryLogger', description: 'Records user queries for frequency tracking and trie updates' },
      { name: 'AutocompleteService', description: 'Orchestrates prefix lookup, ranking, and response formatting' }
    ],

    designPatterns: [
      'Trie Data Structure: Prefix tree for efficient prefix matching',
      'Strategy Pattern: Pluggable ranking strategies (frequency-based, personalized, trending)',
      'Observer Pattern: Update trie when new queries are logged',
      'Cache Pattern: LRU cache for frequently requested prefixes'
    ],

    implementation: `from collections import defaultdict
import heapq

class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False
        self.frequency = 0
        self.top_suggestions = []  # [(frequency, word)]

class AutocompleteTrie:
    def __init__(self, k: int = 5):
        self.root = TrieNode()
        self.k = k  # Number of top suggestions per node

    def insert(self, word: str, frequency: int = 1):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
            self._update_top_k(node, word, frequency)
        node.is_end = True
        node.frequency += frequency

    def _update_top_k(self, node: TrieNode, word: str, freq: int):
        # Remove existing entry for this word if present
        node.top_suggestions = [
            (f, w) for f, w in node.top_suggestions if w != word
        ]
        node.top_suggestions.append((freq, word))
        node.top_suggestions.sort(key=lambda x: -x[0])
        node.top_suggestions = node.top_suggestions[:self.k]

    def search(self, prefix: str) -> list:
        node = self.root
        for char in prefix:
            if char not in node.children:
                return []
            node = node.children[char]
        return [word for _, word in node.top_suggestions]

class AutocompleteService:
    def __init__(self):
        self.trie = AutocompleteTrie(k=5)
        self.query_counts = defaultdict(int)

    def record_query(self, query: str):
        self.query_counts[query] += 1
        self.trie.insert(query, self.query_counts[query])

    def get_suggestions(self, prefix: str) -> list:
        if not prefix:
            return []
        return self.trie.search(prefix.lower())`,

    keyQuestions: [
      {
        question: 'Why use a Trie instead of a database LIKE query for autocomplete?',
        answer: `A Trie provides O(L) lookup time where L is the prefix length, regardless of how many words are stored. A database LIKE query with a prefix pattern (LIKE 'pre%') can use a B-tree index for prefix matching but is still slower due to disk I/O, query parsing overhead, and connection costs.

Tries also support storing pre-computed top-k suggestions at each node, so the response time is constant after reaching the prefix node. Database queries would need to scan, sort, and limit results on every request. For a system serving millions of users typing in real-time, the in-memory Trie is orders of magnitude faster.`
      },
      {
        question: 'How do you handle updates to the autocomplete index?',
        answer: `Two approaches: offline batch updates and online incremental updates. In the batch approach, you periodically (every few hours) rebuild the Trie from aggregated query logs. This is simpler and ensures the Trie reflects stable trends rather than momentary spikes.

In the incremental approach, each new query updates the Trie in real-time. This captures trending queries immediately but requires thread-safe Trie operations. A practical hybrid: maintain a static Trie rebuilt daily and a small dynamic Trie for recent queries. Merge results from both at query time. This balances freshness with stability and performance.`
      },
      {
        question: 'How do you rank autocomplete suggestions?',
        answer: `Basic ranking uses query frequency: more popular queries rank higher. Enhanced ranking combines multiple signals: global frequency (how popular the query is overall), recency (boost recently trending queries), personalization (boost queries similar to the user's search history), and context (boost queries relevant to the user's current session or location).

A scoring function like score = alpha * frequency + beta * recency + gamma * personalization_match combines these signals. The weights are tuned based on user engagement metrics. Some systems also apply a freshness decay: older queries have their frequency discounted over time to prevent stale popular queries from dominating.`
      }
    ],

    tips: [
      'Pre-compute and cache top-k suggestions at each Trie node for instant responses',
      'Add an LRU cache in front of the Trie for the most frequently requested prefixes',
      'Handle special characters, case normalization, and Unicode in the prefix matching',
      'Consider sharding the Trie by first character for horizontal scaling',
      'Debounce client requests (wait 100-200ms after last keystroke) to reduce server load'
    ]
  },
  {
    id: 'traffic-control',
    title: 'Traffic Control System',
    subtitle: 'Intelligent Traffic Signal Manager',
    icon: 'alertCircle',
    color: '#f59e0b',
    difficulty: 'Medium',
    description: 'Design a traffic control system managing intersections with adaptive signal timing and emergency vehicle priority.',

    introduction: `A traffic control system manages traffic signals at intersections to optimize flow, minimize congestion, and ensure safety. It coordinates signal phases (green, yellow, red), adapts timing based on traffic density, and handles emergency vehicle preemption.

The system must ensure safety invariants (conflicting directions never have simultaneous green signals), support multiple intersection topologies, and integrate with sensors for adaptive control.`,

    coreEntities: [
      { name: 'Intersection', description: 'A junction managing multiple traffic signals with phase coordination' },
      { name: 'TrafficSignal', description: 'An individual signal with state (green, yellow, red) and direction association' },
      { name: 'SignalPhase', description: 'A configuration of which signals are green/red simultaneously for safe flow' },
      { name: 'PhaseScheduler', description: 'Manages the sequence and timing of signal phases for an intersection' },
      { name: 'TrafficSensor', description: 'Detects vehicle presence or density at an approach lane' },
      { name: 'EmergencyOverride', description: 'Handles priority preemption for emergency vehicles' },
      { name: 'TrafficController', description: 'Central controller managing multiple intersections' }
    ],

    designPatterns: [
      'State Pattern: Signal states (Green, Yellow, Red) with defined transitions',
      'Observer Pattern: Sensors notify the scheduler of traffic density changes',
      'Strategy Pattern: Different scheduling algorithms (fixed timing, adaptive, actuated)',
      'Command Pattern: Emergency override commands that can preempt and restore normal operation',
      'Mediator Pattern: Controller coordinates multiple intersections for green wave progression'
    ],

    implementation: `from enum import Enum
from abc import ABC, abstractmethod
from threading import Timer, Lock
from datetime import datetime

class SignalState(Enum):
    RED = "red"
    YELLOW = "yellow"
    GREEN = "green"

class TrafficSignal:
    def __init__(self, signal_id: str, direction: str):
        self.signal_id = signal_id
        self.direction = direction
        self.state = SignalState.RED
        self._lock = Lock()

    def set_state(self, state: SignalState):
        with self._lock:
            self.state = state

class SignalPhase:
    def __init__(self, phase_id: str, green_signals: list,
                 min_green: int = 15, max_green: int = 60):
        self.phase_id = phase_id
        self.green_signals = green_signals  # signal IDs that are green
        self.min_green = min_green
        self.max_green = max_green
        self.yellow_duration = 3

class SchedulingStrategy(ABC):
    @abstractmethod
    def get_next_phase_duration(self, phase: SignalPhase,
                                 sensor_data: dict) -> int:
        pass

class FixedTimingStrategy(SchedulingStrategy):
    def __init__(self, default_duration: int = 30):
        self.default_duration = default_duration

    def get_next_phase_duration(self, phase, sensor_data) -> int:
        return self.default_duration

class AdaptiveStrategy(SchedulingStrategy):
    def get_next_phase_duration(self, phase, sensor_data) -> int:
        density = max(sensor_data.get(s, 0) for s in phase.green_signals)
        duration = phase.min_green + int(
            (phase.max_green - phase.min_green) * min(density, 1.0)
        )
        return duration

class Intersection:
    def __init__(self, intersection_id: str,
                 signals: list, phases: list,
                 strategy: SchedulingStrategy):
        self.intersection_id = intersection_id
        self.signals = {s.signal_id: s for s in signals}
        self.phases = phases
        self.strategy = strategy
        self.current_phase_idx = 0
        self.emergency_active = False
        self._timer = None

    def start(self):
        self._activate_phase(self.phases[self.current_phase_idx])

    def _activate_phase(self, phase: SignalPhase):
        for sig_id, signal in self.signals.items():
            if sig_id in phase.green_signals:
                signal.set_state(SignalState.GREEN)
            else:
                signal.set_state(SignalState.RED)

        duration = self.strategy.get_next_phase_duration(phase, {})
        self._timer = Timer(duration, self._transition_to_yellow)
        self._timer.start()

    def _transition_to_yellow(self):
        phase = self.phases[self.current_phase_idx]
        for sig_id in phase.green_signals:
            self.signals[sig_id].set_state(SignalState.YELLOW)
        self._timer = Timer(phase.yellow_duration, self._advance_phase)
        self._timer.start()

    def _advance_phase(self):
        if not self.emergency_active:
            self.current_phase_idx = (
                (self.current_phase_idx + 1) % len(self.phases)
            )
            self._activate_phase(self.phases[self.current_phase_idx])

    def emergency_preempt(self, direction: str):
        self.emergency_active = True
        if self._timer:
            self._timer.cancel()
        for sig_id, signal in self.signals.items():
            if signal.direction == direction:
                signal.set_state(SignalState.GREEN)
            else:
                signal.set_state(SignalState.RED)

    def resume_normal(self):
        self.emergency_active = False
        self._activate_phase(self.phases[self.current_phase_idx])`,

    keyQuestions: [
      {
        question: 'How do you ensure safety invariants at an intersection?',
        answer: `The critical safety invariant is that conflicting directions (e.g., northbound and eastbound) must never have simultaneous green signals. This is enforced through the SignalPhase abstraction: each phase pre-defines which signals are green together, and these phase configurations are validated during system setup to ensure no conflicting directions share a phase.

During transitions, a yellow phase followed by an all-red clearance interval ensures that vehicles from the previous phase have cleared the intersection before the next phase's green signals activate. The system should never transition directly from one green phase to another without this clearance. Hardware interlocks in real systems provide a safety backup if software fails.`
      },
      {
        question: 'How does adaptive signal timing work?',
        answer: `Adaptive timing uses real-time data from sensors (inductive loops, cameras, radar) to adjust green phase durations based on current traffic demand. When a direction has heavy traffic, its green phase is extended (up to a maximum). When a direction has light traffic, its green phase is shortened (down to a minimum).

Advanced adaptive systems like SCOOT and SCATS optimize across multiple intersections simultaneously, creating "green waves" where vehicles hitting a green light at one intersection are likely to hit green at the next. This is achieved by coordinating the phase offsets between adjacent intersections based on the travel time between them.`
      }
    ],

    tips: [
      'Always enforce safety invariants: use validated phase configurations, never allow arbitrary signal state changes',
      'Separate the scheduling strategy from the intersection control for flexibility',
      'Include all-red clearance intervals during phase transitions',
      'Design emergency preemption as a temporary override that restores normal operation automatically',
      'Consider pedestrian signals and pedestrian call buttons in the phase design'
    ]
  },
  {
    id: 'coffee-vending',
    title: 'Coffee Vending Machine',
    subtitle: 'Automated Beverage Dispenser',
    icon: 'coffee',
    color: '#8b5cf6',
    difficulty: 'Hard',
    description: 'Design a coffee vending machine that manages ingredients, recipes, payments, and dispenses multiple beverage types.',

    introduction: `A coffee vending machine manages an inventory of ingredients (coffee beans, milk, sugar, water), supports multiple beverage recipes, handles payment processing, and dispenses drinks. The design must handle concurrent usage, ingredient depletion, and maintenance operations.

This problem tests your ability to model real-world state machines, apply design patterns for extensibility (adding new drinks without modifying core logic), and handle error cases like insufficient ingredients or failed payments gracefully.`,

    coreEntities: [
      { name: 'VendingMachine', description: 'Central controller managing the overall machine state and user interactions' },
      { name: 'Ingredient', description: 'A raw material (coffee, milk, sugar, water) with current quantity and capacity' },
      { name: 'IngredientInventory', description: 'Manages all ingredient stock levels and checks availability' },
      { name: 'Recipe', description: 'Defines ingredients and quantities needed for a specific beverage' },
      { name: 'RecipeRegistry', description: 'Stores all available beverage recipes' },
      { name: 'Beverage', description: 'A dispensable drink with name, recipe, and price' },
      { name: 'PaymentProcessor', description: 'Handles coin/card payment, validates amount, returns change' },
      { name: 'Dispenser', description: 'Physical dispenser that mixes ingredients and outputs the beverage' },
      { name: 'MachineState', description: 'State pattern states: Idle, SelectingBeverage, Processing, Dispensing, OutOfService' }
    ],

    designPatterns: [
      'State Pattern: Machine states (Idle, SelectingBeverage, Processing, Dispensing, OutOfService)',
      'Strategy Pattern: Payment strategies (coin, card, mobile)',
      'Factory Method: Beverage creation from recipes',
      'Observer Pattern: Notify maintenance when ingredients run low',
      'Builder Pattern: Construct complex beverages with customizations (extra shot, no sugar)',
      'Singleton Pattern: Single VendingMachine controller instance'
    ],

    implementation: `from abc import ABC, abstractmethod
from enum import Enum
from dataclasses import dataclass, field
from threading import Lock

class IngredientType(Enum):
    COFFEE = "coffee"
    MILK = "milk"
    SUGAR = "sugar"
    WATER = "water"
    CHOCOLATE = "chocolate"

@dataclass
class Ingredient:
    type: IngredientType
    quantity: float  # in ml or grams
    capacity: float
    low_threshold: float

    def is_available(self, amount: float) -> bool:
        return self.quantity >= amount

    def consume(self, amount: float) -> bool:
        if not self.is_available(amount):
            return False
        self.quantity -= amount
        return True

    def is_low(self) -> bool:
        return self.quantity <= self.low_threshold

    def refill(self):
        self.quantity = self.capacity

@dataclass
class Recipe:
    name: str
    ingredients: dict  # IngredientType -> amount needed
    price: float

class IngredientInventory:
    def __init__(self):
        self.ingredients: dict = {}
        self._lock = Lock()

    def add_ingredient(self, ingredient: Ingredient):
        self.ingredients[ingredient.type] = ingredient

    def can_make(self, recipe: Recipe) -> bool:
        with self._lock:
            return all(
                self.ingredients.get(ing_type, Ingredient(
                    ing_type, 0, 0, 0)).is_available(amount)
                for ing_type, amount in recipe.ingredients.items()
            )

    def consume_ingredients(self, recipe: Recipe) -> bool:
        with self._lock:
            if not self.can_make(recipe):
                return False
            for ing_type, amount in recipe.ingredients.items():
                self.ingredients[ing_type].consume(amount)
            return True

    def get_low_ingredients(self) -> list:
        return [ing for ing in self.ingredients.values() if ing.is_low()]

class MachineStateBase(ABC):
    @abstractmethod
    def select_beverage(self, machine, beverage_name: str): pass
    @abstractmethod
    def insert_payment(self, machine, amount: float): pass
    @abstractmethod
    def dispense(self, machine): pass
    @abstractmethod
    def cancel(self, machine): pass

class IdleState(MachineStateBase):
    def select_beverage(self, machine, beverage_name: str):
        recipe = machine.recipe_registry.get(beverage_name)
        if not recipe:
            return "Beverage not available"
        if not machine.inventory.can_make(recipe):
            return "Ingredients unavailable"
        machine.selected_recipe = recipe
        machine.state = SelectingPaymentState()
        return f"Selected {beverage_name}. Price: {recipe.price}"

    def insert_payment(self, machine, amount): return "Select a beverage first"
    def dispense(self, machine): return "Select a beverage first"
    def cancel(self, machine): return "Nothing to cancel"

class SelectingPaymentState(MachineStateBase):
    def select_beverage(self, machine, name): return "Already selected"
    def insert_payment(self, machine, amount: float):
        machine.payment_balance += amount
        if machine.payment_balance >= machine.selected_recipe.price:
            machine.state = DispensingState()
            return machine.state.dispense(machine)
        remaining = machine.selected_recipe.price - machine.payment_balance
        return f"Insert {remaining:.2f} more"
    def dispense(self, machine): return "Insert payment first"
    def cancel(self, machine):
        refund = machine.payment_balance
        machine.payment_balance = 0
        machine.selected_recipe = None
        machine.state = IdleState()
        return f"Cancelled. Refund: {refund:.2f}"

class DispensingState(MachineStateBase):
    def select_beverage(self, machine, name): return "Dispensing in progress"
    def insert_payment(self, machine, amount): return "Dispensing in progress"
    def dispense(self, machine):
        recipe = machine.selected_recipe
        if not machine.inventory.consume_ingredients(recipe):
            machine.state = IdleState()
            return "Dispensing failed: ingredients depleted"

        change = machine.payment_balance - recipe.price
        machine.payment_balance = 0
        machine.selected_recipe = None
        machine.state = IdleState()

        result = f"Dispensing {recipe.name}..."
        if change > 0:
            result += f" Change: {change:.2f}"
        return result
    def cancel(self, machine): return "Cannot cancel during dispensing"

class CoffeeMachine:
    def __init__(self):
        self.inventory = IngredientInventory()
        self.recipe_registry: dict = {}
        self.state: MachineStateBase = IdleState()
        self.selected_recipe = None
        self.payment_balance = 0.0

    def add_recipe(self, recipe: Recipe):
        self.recipe_registry[recipe.name] = recipe

    def select_beverage(self, name: str) -> str:
        return self.state.select_beverage(self, name)

    def insert_payment(self, amount: float) -> str:
        return self.state.insert_payment(self, amount)

    def cancel(self) -> str:
        return self.state.cancel(self)`,

    keyQuestions: [
      {
        question: 'How does the State pattern simplify the vending machine logic?',
        answer: `Without the State pattern, every method (selectBeverage, insertPayment, dispense, cancel) would have conditional checks on the current state. This results in scattered, hard-to-maintain conditional logic across all methods, and adding a new state requires modifying every method.

With the State pattern, each state encapsulates its own behavior for every operation. The IdleState knows that insertPayment is invalid. The SelectingPaymentState knows how to accumulate payments and transition to DispensingState. Adding a MaintenanceState is a single new class with no changes to existing states. Each state class is small, focused, and independently testable.`
      },
      {
        question: 'How do you handle concurrent usage safely?',
        answer: `The vending machine must handle ingredient checks and consumption atomically. Use a lock around the inventory check-and-consume operation to prevent a race condition where two concurrent users both pass the availability check but only enough ingredients exist for one.

The machine's state transitions should also be serialized. In a multi-threaded environment, use a lock on the state field to prevent two threads from transitioning the state simultaneously. Alternatively, use a message queue where requests are processed sequentially, ensuring the machine handles one user interaction at a time.`
      }
    ],

    tips: [
      'Use the State pattern for clean state management; avoid nested if-else on machine state',
      'Make ingredient consumption atomic with proper locking',
      'Design recipes as data (not code) so new beverages can be added without code changes',
      'Include a low-ingredient notification system for proactive maintenance',
      'Handle all edge cases: insufficient payment, ingredient depletion mid-transaction, and timeout'
    ]
  },
  {
    id: 'inventory-management',
    title: 'Inventory Management',
    subtitle: 'Warehouse Stock Tracking System',
    icon: 'package',
    color: '#f59e0b',
    difficulty: 'Medium',
    description: 'Design an inventory management system for tracking products, stock levels, and warehouse operations.',

    introduction: `An inventory management system tracks products across warehouses, manages stock levels, handles inbound and outbound operations, and provides real-time visibility into inventory status. It must support concurrent operations, enforce business rules (minimum stock levels, expiry tracking), and maintain accurate audit trails.

The system handles the full inventory lifecycle: receiving goods from suppliers, storing them in warehouses with location tracking, fulfilling orders through stock allocation and picking, and triggering replenishment when levels drop below thresholds.`,

    coreEntities: [
      { name: 'Product', description: 'A unique item with SKU, name, category, and unit of measure' },
      { name: 'Warehouse', description: 'A physical storage location with sections and bins' },
      { name: 'StorageLocation', description: 'A specific bin or shelf within a warehouse' },
      { name: 'InventoryItem', description: 'Tracks quantity of a product at a specific storage location' },
      { name: 'StockTransaction', description: 'Records inbound (receive), outbound (ship), and adjustment operations' },
      { name: 'PurchaseOrder', description: 'Inbound order from a supplier' },
      { name: 'StockAlert', description: 'Notification triggered when stock falls below reorder point' },
      { name: 'AuditLog', description: 'Immutable record of all inventory changes for traceability' }
    ],

    designPatterns: [
      'Observer Pattern: Notify stakeholders when stock levels cross thresholds',
      'Strategy Pattern: Different allocation strategies (FIFO, LIFO, FEFO for expiry-based)',
      'Repository Pattern: Abstract data access for products, inventory, and transactions',
      'Command Pattern: Encapsulate inventory operations for undo capability and audit logging',
      'Factory Method: Create different transaction types (receive, ship, adjust, transfer)'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from threading import Lock
from typing import Optional
from collections import defaultdict

class TransactionType(Enum):
    RECEIVE = "receive"
    SHIP = "ship"
    ADJUST = "adjust"
    TRANSFER = "transfer"

@dataclass
class Product:
    sku: str
    name: str
    category: str
    reorder_point: int
    reorder_quantity: int

@dataclass
class InventoryItem:
    product: Product
    warehouse_id: str
    location: str
    quantity: int
    lot_number: Optional[str] = None
    expiry_date: Optional[datetime] = None

@dataclass
class StockTransaction:
    transaction_id: str
    type: TransactionType
    product_sku: str
    warehouse_id: str
    quantity: int
    timestamp: datetime = field(default_factory=datetime.now)
    reference: str = ""
    performed_by: str = ""

class InventoryManager:
    def __init__(self):
        self._inventory: dict = defaultdict(list)  # (sku, warehouse) -> [InventoryItem]
        self._transactions: list = []
        self._observers: list = []
        self._lock = Lock()
        self._tx_counter = 0

    def _gen_tx_id(self) -> str:
        self._tx_counter += 1
        return f"TX-{self._tx_counter:08d}"

    def add_observer(self, observer):
        self._observers.append(observer)

    def _notify_observers(self, product: Product, warehouse_id: str, new_qty: int):
        if new_qty <= product.reorder_point:
            for obs in self._observers:
                obs.on_low_stock(product, warehouse_id, new_qty)

    def receive_stock(self, product: Product, warehouse_id: str,
                      location: str, quantity: int, user: str) -> str:
        with self._lock:
            key = (product.sku, warehouse_id)
            item = self._find_or_create_item(product, warehouse_id, location)
            item.quantity += quantity

            tx = StockTransaction(
                transaction_id=self._gen_tx_id(),
                type=TransactionType.RECEIVE,
                product_sku=product.sku,
                warehouse_id=warehouse_id,
                quantity=quantity,
                performed_by=user
            )
            self._transactions.append(tx)
            return tx.transaction_id

    def ship_stock(self, product_sku: str, warehouse_id: str,
                   quantity: int, user: str) -> str:
        with self._lock:
            total = self.get_stock_level(product_sku, warehouse_id)
            if total < quantity:
                raise ValueError(f"Insufficient stock: {total} < {quantity}")

            remaining = quantity
            key = (product_sku, warehouse_id)
            for item in self._inventory[key]:
                if remaining <= 0:
                    break
                take = min(item.quantity, remaining)
                item.quantity -= take
                remaining -= take

            tx = StockTransaction(
                transaction_id=self._gen_tx_id(),
                type=TransactionType.SHIP,
                product_sku=product_sku,
                warehouse_id=warehouse_id,
                quantity=-quantity,
                performed_by=user
            )
            self._transactions.append(tx)

            new_level = self.get_stock_level(product_sku, warehouse_id)
            product = self._inventory[key][0].product
            self._notify_observers(product, warehouse_id, new_level)
            return tx.transaction_id

    def get_stock_level(self, sku: str, warehouse_id: str) -> int:
        key = (sku, warehouse_id)
        return sum(item.quantity for item in self._inventory[key])

    def _find_or_create_item(self, product, warehouse_id, location):
        key = (product.sku, warehouse_id)
        for item in self._inventory[key]:
            if item.location == location:
                return item
        item = InventoryItem(product, warehouse_id, location, 0)
        self._inventory[key].append(item)
        return item`,

    keyQuestions: [
      {
        question: 'How do you handle concurrent inventory operations?',
        answer: `Inventory systems face critical concurrency issues: two concurrent ship operations might both read sufficient stock but together overdraw it. Use pessimistic locking (acquire a lock on the inventory item before checking and modifying) for high-contention items, or optimistic locking (check-and-update with a version number, retry on conflict) for low-contention items.

At the database level, use SELECT FOR UPDATE to lock rows during read-modify-write operations. At the application level, synchronize access per product-warehouse combination rather than globally to minimize contention. For high-throughput systems, consider event sourcing: append stock transactions to a log and derive current quantities by replaying events.`
      },
      {
        question: 'How do you implement different allocation strategies?',
        answer: `The Strategy pattern allows pluggable allocation logic. FIFO (First In, First Out) allocates the oldest stock first, which is standard for most products. LIFO (Last In, First Out) allocates the newest stock first, sometimes used for non-perishable goods to keep older stock accessible. FEFO (First Expired, First Out) allocates stock closest to expiry first, critical for perishable goods.

Each strategy implements an allocate(items, quantity) method that returns an ordered list of items and amounts to pick. The inventory manager selects the strategy based on product category or warehouse policy. This separation means adding a new strategy (e.g., zone-based allocation for minimizing picking distance) requires only a new strategy class.`
      }
    ],

    tips: [
      'Use optimistic locking with version fields for stock updates to handle concurrent access',
      'Maintain an immutable audit log of every inventory change for traceability and reconciliation',
      'Implement stock alerts as observers that trigger when levels cross configurable thresholds',
      'Separate the physical model (warehouse, bin, shelf) from the logical model (product, quantity)',
      'Support batch and lot tracking for traceability in regulated industries'
    ]
  },
  {
    id: 'restaurant-management',
    title: 'Restaurant Management',
    subtitle: 'Full-Service Restaurant System',
    icon: 'utensils',
    color: '#ef4444',
    difficulty: 'Hard',
    description: 'Design a restaurant management system handling tables, orders, menu management, kitchen workflow, and billing.',

    introduction: `A restaurant management system orchestrates the entire dining experience: managing table assignments and reservations, taking and modifying orders, routing items to the appropriate kitchen stations, tracking order preparation, and generating bills. The system must handle a fast-paced environment with concurrent operations and real-time coordination between front-of-house and back-of-house staff.

The design requires modeling the complex workflow from guest arrival through seating, ordering, cooking, serving, and payment, while handling exceptions like order modifications, special dietary requests, split bills, and table transfers.`,

    coreEntities: [
      { name: 'Restaurant', description: 'Top-level entity managing all restaurant operations' },
      { name: 'Table', description: 'A physical dining table with capacity, status, and current assignment' },
      { name: 'Reservation', description: 'A future table booking with guest info, party size, and time slot' },
      { name: 'MenuItem', description: 'An item on the menu with name, price, category, and preparation station' },
      { name: 'Order', description: 'A collection of order items for a table with status tracking' },
      { name: 'OrderItem', description: 'Individual item in an order with quantity, modifications, and preparation status' },
      { name: 'KitchenStation', description: 'A preparation area (grill, fryer, salad, dessert) that receives order items' },
      { name: 'KitchenTicket', description: 'A ticket sent to a kitchen station listing items to prepare' },
      { name: 'Bill', description: 'The final invoice for a table with line items, tax, tip, and payment' },
      { name: 'Staff', description: 'Restaurant employees with roles (server, chef, host, manager)' }
    ],

    designPatterns: [
      'State Pattern: Table states (Available, Occupied, Reserved, BeingCleaned), Order states (Placed, Preparing, Ready, Served)',
      'Observer Pattern: Kitchen display system observes order placements; servers observe kitchen readiness',
      'Strategy Pattern: Billing strategies (per-person split, item-based split, single payer)',
      'Command Pattern: Order modifications that can be logged and reversed',
      'Factory Method: Create different order item types (food, drink, special)',
      'Mediator Pattern: Restaurant controller mediates between front-of-house and kitchen'
    ],

    implementation: `from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

class TableStatus(Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    CLEANING = "cleaning"

class OrderStatus(Enum):
    PLACED = "placed"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"
    CANCELLED = "cancelled"

class OrderItemStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    READY = "ready"
    SERVED = "served"

@dataclass
class MenuItem:
    item_id: str
    name: str
    price: float
    category: str  # appetizer, main, dessert, drink
    station: str   # grill, fryer, salad, bar
    prep_time_minutes: int
    is_available: bool = True

@dataclass
class OrderItem:
    menu_item: MenuItem
    quantity: int
    modifications: list = field(default_factory=list)
    status: OrderItemStatus = OrderItemStatus.PENDING

@dataclass
class Order:
    order_id: str
    table_id: str
    server_id: str
    items: list = field(default_factory=list)
    status: OrderStatus = OrderStatus.PLACED
    created_at: datetime = field(default_factory=datetime.now)

    def add_item(self, item: OrderItem):
        self.items.append(item)

    @property
    def total(self) -> float:
        return sum(i.menu_item.price * i.quantity for i in self.items
                   if i.status != OrderItemStatus.SERVED or True)

    @property
    def all_ready(self) -> bool:
        return all(i.status == OrderItemStatus.READY for i in self.items)

class Table:
    def __init__(self, table_id: str, capacity: int):
        self.table_id = table_id
        self.capacity = capacity
        self.status = TableStatus.AVAILABLE
        self.current_order: Optional[Order] = None

class KitchenStation:
    def __init__(self, name: str):
        self.name = name
        self.queue: list = []  # OrderItems pending preparation

    def receive_item(self, order_id: str, item: OrderItem):
        self.queue.append((order_id, item))
        item.status = OrderItemStatus.IN_PROGRESS

    def complete_item(self, order_id: str, item: OrderItem):
        item.status = OrderItemStatus.READY
        self.queue = [(oid, i) for oid, i in self.queue
                      if not (oid == order_id and i is item)]

class RestaurantManager:
    def __init__(self):
        self.tables: dict = {}
        self.menu: dict = {}
        self.orders: dict = {}
        self.stations: dict = {}
        self._order_counter = 0

    def add_table(self, table: Table):
        self.tables[table.table_id] = table

    def add_station(self, station: KitchenStation):
        self.stations[station.name] = station

    def seat_party(self, party_size: int) -> Optional[Table]:
        for table in self.tables.values():
            if (table.status == TableStatus.AVAILABLE and
                    table.capacity >= party_size):
                table.status = TableStatus.OCCUPIED
                return table
        return None

    def place_order(self, table_id: str, server_id: str,
                    items: list) -> Order:
        self._order_counter += 1
        order = Order(
            order_id=f"ORD-{self._order_counter:05d}",
            table_id=table_id, server_id=server_id
        )
        for menu_item_id, qty, mods in items:
            menu_item = self.menu[menu_item_id]
            order_item = OrderItem(menu_item, qty, mods)
            order.add_item(order_item)
            station = self.stations.get(menu_item.station)
            if station:
                station.receive_item(order.order_id, order_item)

        order.status = OrderStatus.PREPARING
        self.orders[order.order_id] = order
        self.tables[table_id].current_order = order
        return order

    def generate_bill(self, table_id: str) -> dict:
        table = self.tables[table_id]
        order = table.current_order
        if not order:
            raise ValueError("No active order for this table")

        subtotal = order.total
        tax = subtotal * 0.08
        return {
            "order_id": order.order_id,
            "items": [(i.menu_item.name, i.quantity, i.menu_item.price * i.quantity)
                      for i in order.items],
            "subtotal": subtotal,
            "tax": round(tax, 2),
            "total": round(subtotal + tax, 2)
        }

    def close_table(self, table_id: str):
        table = self.tables[table_id]
        table.current_order = None
        table.status = TableStatus.CLEANING`,

    keyQuestions: [
      {
        question: 'How do you route order items to the correct kitchen stations?',
        answer: `Each MenuItem has a station attribute (grill, fryer, salad, bar, dessert) indicating which kitchen station prepares it. When an order is placed, the system iterates through the order items and dispatches each to the appropriate KitchenStation. Items for the same station on the same order are grouped into a KitchenTicket.

The kitchen display system (KDS) at each station shows pending items in order of receipt. Chefs mark items as complete, which updates the OrderItem status. The system tracks whether all items for an order are ready (the "expo" function) so the server is notified when the complete order is ready for pickup. This routing is essentially a pub/sub or observer system where stations subscribe to items tagged with their station name.`
      },
      {
        question: 'How do you handle order modifications after placement?',
        answer: `Order modifications are handled as Command objects. An AddItemCommand adds an item and dispatches it to the kitchen. A RemoveItemCommand cancels a pending item at the station. A ModifyItemCommand updates preparation instructions. Each command is logged for audit purposes.

For items already in preparation, the modification must notify the kitchen station. If an item is already completed, removal may not be possible (the food is already made). The system should track modification history and associate costs correctly (removed items before preparation are not charged; items removed after preparation may still be charged depending on restaurant policy).`
      }
    ],

    tips: [
      'Model the order lifecycle as a state machine: Placed -> Preparing -> Ready -> Served -> Billed',
      'Route items to kitchen stations based on menu item metadata, not hard-coded logic',
      'Support order modifications as commands that are logged and potentially reversible',
      'Implement the expo (expeditor) function that tracks when all items for an order are ready',
      'Handle split bills using a Strategy pattern with options for equal split, per-item, and custom split'
    ]
  },
  {
    id: 'social-network',
    title: 'Social Network',
    subtitle: 'Social Media Platform',
    icon: 'users',
    color: '#3b82f6',
    difficulty: 'Medium',
    description: 'Design a social network platform supporting user profiles, friendships, posts, feeds, and messaging.',

    introduction: `A social network platform manages user identities, social connections, content creation, and content distribution. The core challenge is modeling the social graph (users and their relationships), generating personalized feeds, and handling the fan-out problem when a user with many followers creates a post.

The design covers user profiles, friend/follow relationships, posting and commenting, news feed generation, and private messaging between users.`,

    coreEntities: [
      { name: 'User', description: 'A registered user with profile information and privacy settings' },
      { name: 'Profile', description: 'User display information: name, bio, avatar, location' },
      { name: 'FriendshipManager', description: 'Manages follow/friend relationships and the social graph' },
      { name: 'Post', description: 'Content created by a user: text, images, visibility settings' },
      { name: 'Comment', description: 'A response to a post with text and author' },
      { name: 'Feed', description: 'A personalized stream of posts for a user, generated from their connections' },
      { name: 'FeedGenerator', description: 'Creates a user feed from followed users posts, ranked by relevance' },
      { name: 'Message', description: 'A private message between two users' },
      { name: 'Conversation', description: 'A thread of messages between participants' },
      { name: 'NotificationService', description: 'Notifies users of interactions: likes, comments, follows, messages' }
    ],

    designPatterns: [
      'Observer Pattern: Notify followers when a user creates a post',
      'Strategy Pattern: Feed ranking algorithms (chronological, engagement-based, ML-ranked)',
      'Factory Method: Create different content types (text, image, video, link)',
      'Facade Pattern: Unified API for complex social operations (post creation, feed generation)',
      'Iterator Pattern: Paginate through feeds and search results'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict
from typing import Optional

@dataclass
class User:
    user_id: str
    username: str
    email: str
    display_name: str
    bio: str = ""
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class Post:
    post_id: str
    author_id: str
    content: str
    created_at: datetime = field(default_factory=datetime.now)
    likes: set = field(default_factory=set)
    comments: list = field(default_factory=list)
    visibility: str = "public"  # public, friends, private

    def add_like(self, user_id: str):
        self.likes.add(user_id)

    def remove_like(self, user_id: str):
        self.likes.discard(user_id)

@dataclass
class Comment:
    comment_id: str
    post_id: str
    author_id: str
    content: str
    created_at: datetime = field(default_factory=datetime.now)

class SocialGraph:
    def __init__(self):
        self.following: dict = defaultdict(set)  # user -> set of users they follow
        self.followers: dict = defaultdict(set)   # user -> set of their followers

    def follow(self, follower_id: str, followee_id: str):
        self.following[follower_id].add(followee_id)
        self.followers[followee_id].add(follower_id)

    def unfollow(self, follower_id: str, followee_id: str):
        self.following[follower_id].discard(followee_id)
        self.followers[followee_id].discard(follower_id)

    def get_followers(self, user_id: str) -> set:
        return self.followers[user_id]

    def get_following(self, user_id: str) -> set:
        return self.following[user_id]

    def are_friends(self, user_a: str, user_b: str) -> bool:
        return user_b in self.following[user_a] and user_a in self.following[user_b]

class FeedGenerator:
    def __init__(self, social_graph: SocialGraph, post_store: dict):
        self.graph = social_graph
        self.posts = post_store  # user_id -> [Post]

    def generate_feed(self, user_id: str, limit: int = 20) -> list:
        following = self.graph.get_following(user_id)
        candidate_posts = []

        for followed_id in following:
            user_posts = self.posts.get(followed_id, [])
            for post in user_posts:
                if self._is_visible(post, user_id):
                    candidate_posts.append(post)

        # Sort by relevance: engagement score + recency
        candidate_posts.sort(
            key=lambda p: self._score(p, user_id), reverse=True
        )
        return candidate_posts[:limit]

    def _score(self, post: Post, viewer_id: str) -> float:
        recency = 1.0 / (1 + (datetime.now() - post.created_at).total_seconds() / 3600)
        engagement = len(post.likes) + len(post.comments) * 2
        return recency * 10 + engagement

    def _is_visible(self, post: Post, viewer_id: str) -> bool:
        if post.visibility == "public":
            return True
        if post.visibility == "friends":
            return self.graph.are_friends(post.author_id, viewer_id)
        return False

class SocialNetwork:
    def __init__(self):
        self.users: dict = {}
        self.graph = SocialGraph()
        self.user_posts: dict = defaultdict(list)
        self._post_counter = 0
        self._comment_counter = 0
        self.feed_gen = FeedGenerator(self.graph, self.user_posts)

    def register_user(self, user: User):
        self.users[user.user_id] = user

    def create_post(self, author_id: str, content: str,
                    visibility: str = "public") -> Post:
        self._post_counter += 1
        post = Post(
            post_id=f"POST-{self._post_counter}",
            author_id=author_id, content=content,
            visibility=visibility
        )
        self.user_posts[author_id].append(post)
        return post

    def get_feed(self, user_id: str) -> list:
        return self.feed_gen.generate_feed(user_id)`,

    keyQuestions: [
      {
        question: 'How do you handle feed generation for users following many accounts?',
        answer: `Two main approaches: fan-out-on-write and fan-out-on-read. Fan-out-on-write: when a user posts, immediately push the post to all followers' pre-computed feed caches. This is fast for reading feeds (just read the cache) but expensive for users with millions of followers (celebrity problem). Fan-out-on-read: when a user requests their feed, dynamically query and merge posts from all followed users. This is fast for posting but expensive for reading, especially for users following many accounts.

A hybrid approach works best: fan-out-on-write for regular users (most users have few followers) and fan-out-on-read for celebrities (merge their posts into the feed at read time). This is the approach used by Twitter and Instagram.`
      },
      {
        question: 'How do you implement feed ranking?',
        answer: `The Strategy pattern enables pluggable ranking algorithms. A simple chronological strategy sorts by timestamp. An engagement-based strategy combines likes, comments, shares, and recency. An ML-based strategy uses a trained model that considers user preferences, content type, author relationship strength, and historical engagement patterns.

The ranking score for each candidate post considers: recency (decay function on post age), affinity (how often the viewer interacts with the author), engagement (total interactions from the community), and content type preferences (the viewer's history of engaging with text vs images vs videos). The ranker scores all candidate posts and returns the top N. This separation of ranking from feed assembly allows A/B testing different algorithms.`
      }
    ],

    tips: [
      'Separate the social graph from user profiles for independent scaling',
      'Use a hybrid fan-out strategy: push for regular users, pull for celebrities',
      'Implement feed ranking as a pluggable strategy for easy experimentation',
      'Cache pre-computed feeds and invalidate on new posts from followed users',
      'Handle privacy controls at the post level, not just the profile level'
    ]
  },
  {
    id: 'learning-platform',
    title: 'Learning Platform',
    subtitle: 'Online Education System',
    icon: 'bookOpen',
    color: '#10b981',
    difficulty: 'Medium',
    description: 'Design an online learning platform supporting courses, lessons, quizzes, progress tracking, and certifications.',

    introduction: `An online learning platform manages the full educational experience: course catalog, enrollment, content delivery, progress tracking, assessments, and certification. It must support multiple content types (video, text, interactive exercises), track learner progress granularly, and adapt to different learning paths.

The core challenge is modeling the course structure (courses contain modules, modules contain lessons, lessons contain content blocks) as a tree hierarchy while tracking each user's progress through that tree independently.`,

    coreEntities: [
      { name: 'Course', description: 'Top-level learning unit with title, description, instructor, and prerequisites' },
      { name: 'Module', description: 'A thematic section within a course containing related lessons' },
      { name: 'Lesson', description: 'An individual learning unit with content blocks and optional quiz' },
      { name: 'ContentBlock', description: 'A piece of content within a lesson: video, text, code exercise, or interactive widget' },
      { name: 'Quiz', description: 'An assessment with questions and a passing threshold' },
      { name: 'Question', description: 'Individual quiz question with answer options and correct answer' },
      { name: 'Enrollment', description: 'Links a user to a course with enrollment date and completion status' },
      { name: 'Progress', description: 'Tracks user completion of individual lessons and modules' },
      { name: 'Certificate', description: 'Issued upon course completion, with verification code' },
      { name: 'Instructor', description: 'Course creator with profile and teaching credentials' }
    ],

    designPatterns: [
      'Composite Pattern: Course -> Module -> Lesson -> ContentBlock tree structure',
      'Observer Pattern: Notify users of new content, deadlines, and certificate issuance',
      'Strategy Pattern: Different grading strategies (pass/fail, percentage, weighted)',
      'Template Method: Common enrollment workflow with customizable prerequisites check',
      'State Pattern: Enrollment states (Active, Paused, Completed, Expired)'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
import uuid

class EnrollmentStatus(Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    EXPIRED = "expired"

@dataclass
class ContentBlock:
    block_id: str
    content_type: str  # video, text, code_exercise
    title: str
    content: str  # URL for video, text for article, etc.
    duration_minutes: int = 0

@dataclass
class Question:
    question_id: str
    text: str
    options: list
    correct_answer: int  # index of correct option

@dataclass
class Quiz:
    quiz_id: str
    title: str
    questions: list
    passing_score: float = 0.7
    max_attempts: int = 3

@dataclass
class Lesson:
    lesson_id: str
    title: str
    content_blocks: list = field(default_factory=list)
    quiz: Optional[Quiz] = None
    order: int = 0

@dataclass
class Module:
    module_id: str
    title: str
    lessons: list = field(default_factory=list)
    order: int = 0

@dataclass
class Course:
    course_id: str
    title: str
    description: str
    instructor_id: str
    modules: list = field(default_factory=list)
    prerequisites: list = field(default_factory=list)

    @property
    def total_lessons(self) -> int:
        return sum(len(m.lessons) for m in self.modules)

class ProgressTracker:
    def __init__(self):
        self._completed_lessons: dict = {}  # (user_id, course_id) -> set of lesson_ids
        self._quiz_scores: dict = {}  # (user_id, quiz_id) -> [scores]

    def complete_lesson(self, user_id: str, course_id: str, lesson_id: str):
        key = (user_id, course_id)
        if key not in self._completed_lessons:
            self._completed_lessons[key] = set()
        self._completed_lessons[key].add(lesson_id)

    def get_progress_percent(self, user_id: str, course: Course) -> float:
        key = (user_id, course.course_id)
        completed = len(self._completed_lessons.get(key, set()))
        total = course.total_lessons
        return (completed / total * 100) if total > 0 else 0

    def submit_quiz(self, user_id: str, quiz: Quiz, answers: list) -> dict:
        correct = sum(
            1 for q, a in zip(quiz.questions, answers)
            if a == q.correct_answer
        )
        score = correct / len(quiz.questions) if quiz.questions else 0
        passed = score >= quiz.passing_score

        key = (user_id, quiz.quiz_id)
        if key not in self._quiz_scores:
            self._quiz_scores[key] = []
        self._quiz_scores[key].append(score)

        return {"score": score, "passed": passed, "correct": correct,
                "total": len(quiz.questions)}

class LearningPlatform:
    def __init__(self):
        self.courses: dict = {}
        self.enrollments: dict = {}  # (user_id, course_id) -> Enrollment
        self.progress = ProgressTracker()

    def create_course(self, course: Course):
        self.courses[course.course_id] = course

    def enroll(self, user_id: str, course_id: str) -> bool:
        course = self.courses.get(course_id)
        if not course:
            return False
        key = (user_id, course_id)
        if key in self.enrollments:
            return False
        self.enrollments[key] = {
            "status": EnrollmentStatus.ACTIVE,
            "enrolled_at": datetime.now()
        }
        return True

    def complete_lesson(self, user_id: str, course_id: str, lesson_id: str):
        self.progress.complete_lesson(user_id, course_id, lesson_id)
        course = self.courses[course_id]
        if self.progress.get_progress_percent(user_id, course) >= 100:
            self._issue_certificate(user_id, course_id)

    def _issue_certificate(self, user_id: str, course_id: str) -> str:
        key = (user_id, course_id)
        self.enrollments[key]["status"] = EnrollmentStatus.COMPLETED
        cert_id = f"CERT-{uuid.uuid4().hex[:8].upper()}"
        self.enrollments[key]["certificate_id"] = cert_id
        return cert_id`,

    keyQuestions: [
      {
        question: 'How do you model the course content hierarchy?',
        answer: `The Composite pattern naturally models the Course -> Module -> Lesson -> ContentBlock hierarchy. Each level implements a common LearningComponent interface with methods like getDuration() and getCompletionCriteria(). A Module's duration is the sum of its lessons' durations. A Course's duration is the sum of its modules' durations.

This recursive structure makes it easy to compute aggregate properties (total duration, completion percentage, content count) at any level. It also supports flexible course design: some courses might have a flat structure (just lessons), while others have deep nesting (courses with modules, sub-modules, and lessons).`
      },
      {
        question: 'How do you track granular progress without excessive storage?',
        answer: `Store completion records at the lesson level (the atomic unit). Module and course completion are computed by aggregating lesson completions. This avoids redundant storage while enabling progress queries at any level.

For content blocks within a lesson, track progress client-side and report lesson completion when all blocks are consumed. For quizzes, store attempt records with scores. Use a sparse representation: only store records for completed items, not for incomplete ones. A user's progress for a course is: count of completed lessons / total lessons. This is computationally cheap and storage-efficient.`
      }
    ],

    tips: [
      'Use the Composite pattern for the course structure hierarchy',
      'Track progress at the lesson level; derive module and course progress by aggregation',
      'Support multiple content types through a polymorphic ContentBlock abstraction',
      'Implement prerequisite checking before enrollment to enforce learning paths',
      'Generate verifiable certificates with unique codes that can be validated externally'
    ]
  },
  {
    id: 'cricinfo',
    title: 'CricInfo',
    subtitle: 'Live Cricket Score Platform',
    icon: 'activity',
    color: '#ef4444',
    difficulty: 'Hard',
    description: 'Design a cricket information system with live scoring, match management, player statistics, and commentary.',

    introduction: `CricInfo is a comprehensive cricket information platform that provides live ball-by-ball scoring, detailed match information, player and team statistics, and real-time commentary. The system must handle the complex domain of cricket with its multiple match formats (Test, ODI, T20), detailed scoring rules, and real-time updates to millions of concurrent viewers.

The key design challenge is modeling the nested structure of cricket (match -> innings -> over -> ball) while supporting real-time updates and historical statistics aggregation.`,

    coreEntities: [
      { name: 'Match', description: 'A cricket match with teams, venue, format, and innings' },
      { name: 'Innings', description: 'One team batting turn with overs, runs, and wickets' },
      { name: 'Over', description: 'A set of 6 legal deliveries bowled by one bowler' },
      { name: 'Ball', description: 'A single delivery with outcome (runs, wicket, extra)' },
      { name: 'Player', description: 'A cricketer with career statistics and current match performance' },
      { name: 'Team', description: 'A team with roster and team statistics' },
      { name: 'Scorecard', description: 'Current match score summary with batting/bowling figures' },
      { name: 'Commentary', description: 'Ball-by-ball text commentary with timestamps' },
      { name: 'Scorer', description: 'Authorized user who enters ball-by-ball data' },
      { name: 'MatchFormat', description: 'Rules for Test, ODI, or T20 format (overs limit, innings count)' }
    ],

    designPatterns: [
      'Observer Pattern: Push live score updates to subscribers (web clients, mobile apps)',
      'State Pattern: Match states (Scheduled, Live, InningsBreak, Completed, Abandoned)',
      'Composite Pattern: Match -> Innings -> Over -> Ball hierarchy',
      'Strategy Pattern: Scoring rules vary by format (Test vs ODI vs T20)',
      'Command Pattern: Ball entry as reversible commands for scorer corrections',
      'Factory Method: Create match instances based on format type'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional

class MatchFormat(Enum):
    TEST = "test"
    ODI = "odi"
    T20 = "t20"

class BallOutcome(Enum):
    DOT = 0
    SINGLE = 1
    DOUBLE = 2
    TRIPLE = 3
    FOUR = 4
    SIX = 6
    WIDE = -1
    NO_BALL = -2
    WICKET = -3
    LEG_BYE = -4

class MatchState(Enum):
    SCHEDULED = "scheduled"
    TOSS = "toss"
    LIVE = "live"
    INNINGS_BREAK = "innings_break"
    COMPLETED = "completed"
    ABANDONED = "abandoned"

@dataclass
class Player:
    player_id: str
    name: str
    team_id: str
    batting_style: str = ""
    bowling_style: str = ""

@dataclass
class BallEvent:
    ball_number: int
    bowler_id: str
    batsman_id: str
    outcome: BallOutcome
    runs: int = 0
    is_wicket: bool = False
    wicket_type: str = ""
    dismissed_player_id: str = ""
    commentary: str = ""
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class Over:
    over_number: int
    bowler_id: str
    balls: list = field(default_factory=list)

    @property
    def runs_conceded(self) -> int:
        return sum(b.runs for b in self.balls)

    @property
    def wickets(self) -> int:
        return sum(1 for b in self.balls if b.is_wicket)

    @property
    def legal_deliveries(self) -> int:
        return sum(1 for b in self.balls
                   if b.outcome not in (BallOutcome.WIDE, BallOutcome.NO_BALL))

    @property
    def is_complete(self) -> bool:
        return self.legal_deliveries >= 6

@dataclass
class Innings:
    innings_number: int
    batting_team_id: str
    bowling_team_id: str
    overs: list = field(default_factory=list)
    target: Optional[int] = None

    @property
    def total_runs(self) -> int:
        return sum(o.runs_conceded for o in self.overs)

    @property
    def total_wickets(self) -> int:
        return sum(o.wickets for o in self.overs)

    @property
    def overs_bowled(self) -> float:
        if not self.overs:
            return 0.0
        complete = len([o for o in self.overs if o.is_complete])
        current = self.overs[-1]
        if current.is_complete:
            return float(complete)
        return complete + current.legal_deliveries / 10

    @property
    def run_rate(self) -> float:
        overs = self.overs_bowled
        return self.total_runs / overs if overs > 0 else 0.0

class LiveMatch:
    def __init__(self, match_id: str, team_a_id: str, team_b_id: str,
                 match_format: MatchFormat, venue: str):
        self.match_id = match_id
        self.team_a_id = team_a_id
        self.team_b_id = team_b_id
        self.format = match_format
        self.venue = venue
        self.state = MatchState.SCHEDULED
        self.innings_list: list = []
        self.current_innings: Optional[Innings] = None
        self._subscribers: list = []

    def subscribe(self, callback):
        self._subscribers.append(callback)

    def _notify(self, event_type: str, data: dict):
        for cb in self._subscribers:
            cb(event_type, data)

    def start_innings(self, batting_team_id: str, bowling_team_id: str,
                      target: int = None):
        innings = Innings(
            innings_number=len(self.innings_list) + 1,
            batting_team_id=batting_team_id,
            bowling_team_id=bowling_team_id,
            target=target
        )
        self.innings_list.append(innings)
        self.current_innings = innings
        self.state = MatchState.LIVE

    def record_ball(self, bowler_id: str, batsman_id: str,
                    outcome: BallOutcome, runs: int = 0,
                    **kwargs) -> BallEvent:
        innings = self.current_innings
        if not innings.overs or innings.overs[-1].is_complete:
            over_num = len(innings.overs) + 1
            innings.overs.append(Over(over_number=over_num, bowler_id=bowler_id))

        current_over = innings.overs[-1]
        ball = BallEvent(
            ball_number=current_over.legal_deliveries + 1,
            bowler_id=bowler_id, batsman_id=batsman_id,
            outcome=outcome, runs=runs, **kwargs
        )
        current_over.balls.append(ball)

        self._notify("ball", {
            "innings": innings.innings_number,
            "over": current_over.over_number,
            "ball": ball,
            "score": f"{innings.total_runs}/{innings.total_wickets}",
            "overs": innings.overs_bowled
        })
        return ball

    def get_scorecard(self) -> dict:
        return {
            "match_id": self.match_id,
            "state": self.state.value,
            "innings": [
                {
                    "batting_team": inn.batting_team_id,
                    "runs": inn.total_runs,
                    "wickets": inn.total_wickets,
                    "overs": inn.overs_bowled,
                    "run_rate": round(inn.run_rate, 2)
                }
                for inn in self.innings_list
            ]
        }`,

    keyQuestions: [
      {
        question: 'How do you handle real-time score updates to millions of viewers?',
        answer: `Use the Observer pattern at the application level with a pub/sub infrastructure at scale. When a ball is recorded, the system publishes a score update event. Web clients connect via WebSocket or Server-Sent Events. A message broker (Redis Pub/Sub, Kafka) distributes events to multiple application servers, each maintaining connections to a subset of clients.

For extreme scale, use a CDN with edge push capabilities. The score update is published once to the CDN, which pushes to millions of edge locations simultaneously. Clients poll the CDN edge (cached for 1-2 seconds) rather than hitting the origin server. This reduces origin load from millions of requests to a handful of CDN purge/push operations per ball.`
      },
      {
        question: 'How do you model the cricket scoring domain accurately?',
        answer: `Cricket has a deeply nested domain: Match -> Innings -> Over -> Ball. Each ball has complex outcomes: runs scored (0-6), extras (wides, no-balls, byes, leg-byes), and wickets (bowled, caught, run-out, LBW, stumped, etc.). An Over has exactly 6 legal deliveries, but extras (wides, no-balls) do not count toward the 6.

Model each Ball as a rich event object capturing all outcome details. Over.legal_deliveries counts only non-extra balls. Innings aggregates runs and wickets from its overs. The Match aggregates innings. This composite structure makes it easy to compute any statistic at any level: bowler figures (filter balls by bowler), batsman score (filter balls by batsman), partnership runs (filter balls during a specific partnership period).`
      }
    ],

    tips: [
      'Model the match hierarchy as Match -> Innings -> Over -> Ball with rich event objects',
      'Use the Observer pattern for real-time score push notifications',
      'Implement ball recording as commands to support scorer corrections (undo/redo)',
      'Pre-compute common statistics (batting average, bowling economy) and update incrementally',
      'Handle match format differences (Test: unlimited overs, ODI: 50, T20: 20) through strategy/configuration'
    ]
  },
  {
    id: 'linkedin-lld',
    title: 'LinkedIn',
    subtitle: 'Professional Networking Platform',
    icon: 'briefcase',
    color: '#0077b5',
    difficulty: 'Hard',
    description: 'Design a professional networking platform with profiles, connections, job postings, and a content feed.',

    introduction: `LinkedIn is a professional networking platform that connects professionals, facilitates job searching, and enables knowledge sharing. The LLD focuses on core features: rich user profiles with work history, a connection system (requests, degrees of separation), job posting and application workflow, and a professional content feed.

The design must handle the professional graph (connections and their degrees), profile visibility rules, job matching, and feed personalization based on professional interests and network.`,

    coreEntities: [
      { name: 'UserProfile', description: 'Professional profile with headline, summary, skills, and visibility settings' },
      { name: 'Experience', description: 'Work history entry with company, title, duration, and description' },
      { name: 'Education', description: 'Educational background with institution, degree, and field of study' },
      { name: 'ConnectionManager', description: 'Manages connection requests, approvals, and the professional graph' },
      { name: 'ConnectionRequest', description: 'A pending connection invitation with message' },
      { name: 'JobPosting', description: 'A job listing with requirements, description, and application details' },
      { name: 'JobApplication', description: 'A user application to a job posting with status tracking' },
      { name: 'Company', description: 'A company page with info, followers, and job postings' },
      { name: 'Post', description: 'Professional content shared in the feed with reactions and comments' },
      { name: 'Skill', description: 'A professional skill with endorsements from connections' },
      { name: 'SearchService', description: 'Searches users, jobs, and companies with filters' }
    ],

    designPatterns: [
      'Observer Pattern: Notify users of connection requests, job matches, and profile views',
      'Strategy Pattern: Job matching algorithms, feed ranking strategies',
      'State Pattern: Connection request states (Pending, Accepted, Rejected, Withdrawn)',
      'Factory Method: Create different content types (article, post, job share)',
      'Facade Pattern: Unified profile API combining experiences, education, skills, and recommendations'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from collections import defaultdict, deque
from typing import Optional

class ConnectionStatus(Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class JobApplicationStatus(Enum):
    APPLIED = "applied"
    REVIEWED = "reviewed"
    SHORTLISTED = "shortlisted"
    INTERVIEWED = "interviewed"
    OFFERED = "offered"
    REJECTED = "rejected"

@dataclass
class Experience:
    company: str
    title: str
    start_date: datetime
    end_date: Optional[datetime] = None
    description: str = ""

@dataclass
class UserProfile:
    user_id: str
    name: str
    headline: str
    summary: str = ""
    experiences: list = field(default_factory=list)
    education: list = field(default_factory=list)
    skills: list = field(default_factory=list)

class ConnectionGraph:
    def __init__(self):
        self.connections: dict = defaultdict(set)
        self.pending: dict = {}  # (sender, receiver) -> ConnectionRequest

    def send_request(self, sender_id: str, receiver_id: str,
                     message: str = "") -> bool:
        if receiver_id in self.connections[sender_id]:
            return False  # Already connected
        key = (sender_id, receiver_id)
        if key in self.pending:
            return False  # Already pending
        self.pending[key] = {
            "status": ConnectionStatus.PENDING,
            "message": message,
            "sent_at": datetime.now()
        }
        return True

    def accept_request(self, sender_id: str, receiver_id: str) -> bool:
        key = (sender_id, receiver_id)
        if key not in self.pending:
            return False
        self.connections[sender_id].add(receiver_id)
        self.connections[receiver_id].add(sender_id)
        del self.pending[key]
        return True

    def get_connections(self, user_id: str) -> set:
        return self.connections[user_id]

    def get_degree(self, user_a: str, user_b: str) -> int:
        """BFS to find degree of separation"""
        if user_a == user_b:
            return 0
        visited = {user_a}
        queue = deque([(user_a, 0)])
        while queue:
            current, depth = queue.popleft()
            if depth > 3:
                return -1  # Beyond 3rd degree
            for neighbor in self.connections[current]:
                if neighbor == user_b:
                    return depth + 1
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, depth + 1))
        return -1

@dataclass
class JobPosting:
    job_id: str
    company_id: str
    title: str
    description: str
    requirements: list
    location: str
    posted_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True

class JobService:
    def __init__(self):
        self.postings: dict = {}
        self.applications: dict = defaultdict(list)

    def post_job(self, posting: JobPosting):
        self.postings[posting.job_id] = posting

    def apply(self, user_id: str, job_id: str, resume_url: str) -> dict:
        application = {
            "user_id": user_id, "job_id": job_id,
            "resume_url": resume_url,
            "status": JobApplicationStatus.APPLIED,
            "applied_at": datetime.now()
        }
        self.applications[job_id].append(application)
        return application

    def search_jobs(self, keywords: list, location: str = "") -> list:
        results = []
        for posting in self.postings.values():
            if not posting.is_active:
                continue
            text = f"{posting.title} {posting.description}".lower()
            if any(kw.lower() in text for kw in keywords):
                if not location or location.lower() in posting.location.lower():
                    results.append(posting)
        return results`,

    keyQuestions: [
      {
        question: 'How do you efficiently compute degrees of separation?',
        answer: `For real-time queries, use bidirectional BFS from both users simultaneously. When the two search frontiers meet, the sum of their depths is the degree of separation. This is significantly faster than unidirectional BFS for large graphs because it explores far fewer nodes.

For frequently queried pairs, pre-compute and cache the degree. Store 1st-degree connections directly. For 2nd-degree suggestions ("People you may know"), batch-compute the set of friends-of-friends periodically. LinkedIn limits the displayed degree to 3rd, so the BFS depth is bounded, keeping queries tractable even for millions of users.`
      },
      {
        question: 'How do you match users to relevant job postings?',
        answer: `Job matching combines content-based and collaborative filtering. Content-based: compare the user's skills, experience titles, and industry against job requirements using text similarity (TF-IDF, embedding cosine similarity). Score each job against the user's profile features.

Collaborative filtering: users similar to this user (similar profiles, similar application history) applied to these jobs, so recommend those jobs. Combine both signals with weights tuned on application and response data. The Strategy pattern enables swapping between simple keyword matching (early stage) and ML-based matching (mature stage) as the platform grows.`
      }
    ],

    tips: [
      'Model the professional graph separately from profiles for efficient traversal queries',
      'Limit degree-of-separation computation to 3 degrees for practical performance',
      'Use BFS (not DFS) for shortest-path degree computation in the connection graph',
      'Implement job matching as a strategy to enable iterative algorithm improvement',
      'Handle profile visibility based on connection degree (1st degree sees full, 3rd sees limited)'
    ]
  },
  {
    id: 'spotify-lld',
    title: 'Spotify',
    subtitle: 'Music Streaming Platform',
    icon: 'music',
    color: '#1db954',
    difficulty: 'Hard',
    description: 'Design a music streaming platform with playlists, recommendations, offline support, and social features.',

    introduction: `A music streaming platform manages a vast catalog of songs, enables playlist creation and sharing, provides personalized recommendations, supports offline downloads, and handles concurrent streaming for millions of users. The LLD focuses on the domain model for music organization, playlist management, playback control, and the recommendation engine.

The core challenge is modeling the music domain (artists, albums, tracks), the user interaction domain (playlists, listening history, preferences), and the playback domain (queue management, shuffle, repeat modes) while supporting real-time and collaborative features.`,

    coreEntities: [
      { name: 'Track', description: 'A single song with metadata: title, duration, genre, audio URL' },
      { name: 'Album', description: 'A collection of tracks released together by an artist' },
      { name: 'Artist', description: 'A music creator with discography and follower count' },
      { name: 'Playlist', description: 'A user-created ordered collection of tracks' },
      { name: 'UserLibrary', description: 'A user saved tracks, albums, playlists, and followed artists' },
      { name: 'PlaybackController', description: 'Manages current playback state: playing track, queue, position, repeat/shuffle' },
      { name: 'PlayQueue', description: 'The ordered list of upcoming tracks with next/previous navigation' },
      { name: 'ListeningHistory', description: 'Records play events for analytics and recommendations' },
      { name: 'RecommendationEngine', description: 'Generates personalized track and playlist suggestions' },
      { name: 'SearchService', description: 'Full-text search across tracks, artists, albums, and playlists' }
    ],

    designPatterns: [
      'Observer Pattern: UI components observe playback state changes (track change, pause, progress)',
      'Strategy Pattern: Shuffle algorithms (Fisher-Yates, weighted shuffle favoring less-played tracks)',
      'State Pattern: Playback states (Playing, Paused, Stopped, Buffering)',
      'Iterator Pattern: Queue traversal with next/previous and repeat modes',
      'Command Pattern: Playback controls (play, pause, skip) as undoable commands',
      'Decorator Pattern: Add features to playlists (collaborative, public, offline-available)'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
import random

@dataclass
class Track:
    track_id: str
    title: str
    artist_id: str
    album_id: str
    duration_seconds: int
    genre: str
    audio_url: str

@dataclass
class Playlist:
    playlist_id: str
    name: str
    owner_id: str
    tracks: list = field(default_factory=list)
    is_public: bool = True
    is_collaborative: bool = False
    created_at: datetime = field(default_factory=datetime.now)

    def add_track(self, track: Track, position: int = -1):
        if position < 0:
            self.tracks.append(track)
        else:
            self.tracks.insert(position, track)

    def remove_track(self, track_id: str):
        self.tracks = [t for t in self.tracks if t.track_id != track_id]

    def reorder(self, from_idx: int, to_idx: int):
        track = self.tracks.pop(from_idx)
        self.tracks.insert(to_idx, track)

    @property
    def total_duration(self) -> int:
        return sum(t.duration_seconds for t in self.tracks)

class RepeatMode(Enum):
    OFF = "off"
    ALL = "all"
    ONE = "one"

class PlaybackState(Enum):
    STOPPED = "stopped"
    PLAYING = "playing"
    PAUSED = "paused"

class PlaybackController:
    def __init__(self):
        self.state = PlaybackState.STOPPED
        self.current_track: Optional[Track] = None
        self.position_seconds: int = 0
        self.queue: list = []
        self.queue_index: int = -1
        self.shuffle_enabled: bool = False
        self.repeat_mode: RepeatMode = RepeatMode.OFF
        self._original_queue: list = []
        self._observers: list = []

    def add_observer(self, observer):
        self._observers.append(observer)

    def _notify(self, event: str):
        for obs in self._observers:
            obs.on_playback_event(event, self)

    def load_playlist(self, playlist: 'Playlist'):
        self.queue = list(playlist.tracks)
        self._original_queue = list(playlist.tracks)
        if self.shuffle_enabled:
            self._shuffle_queue()
        self.queue_index = 0
        if self.queue:
            self.play()

    def play(self):
        if self.queue and 0 <= self.queue_index < len(self.queue):
            self.current_track = self.queue[self.queue_index]
            self.state = PlaybackState.PLAYING
            self.position_seconds = 0
            self._notify("track_changed")

    def pause(self):
        if self.state == PlaybackState.PLAYING:
            self.state = PlaybackState.PAUSED
            self._notify("paused")

    def resume(self):
        if self.state == PlaybackState.PAUSED:
            self.state = PlaybackState.PLAYING
            self._notify("resumed")

    def next_track(self):
        if self.repeat_mode == RepeatMode.ONE:
            self.play()
            return
        self.queue_index += 1
        if self.queue_index >= len(self.queue):
            if self.repeat_mode == RepeatMode.ALL:
                self.queue_index = 0
                if self.shuffle_enabled:
                    self._shuffle_queue()
            else:
                self.state = PlaybackState.STOPPED
                self._notify("queue_ended")
                return
        self.play()

    def previous_track(self):
        if self.position_seconds > 3:
            self.position_seconds = 0
            self.play()
            return
        self.queue_index = max(0, self.queue_index - 1)
        self.play()

    def toggle_shuffle(self):
        self.shuffle_enabled = not self.shuffle_enabled
        if self.shuffle_enabled:
            self._shuffle_queue()
        else:
            current = self.current_track
            self.queue = list(self._original_queue)
            if current:
                self.queue_index = next(
                    (i for i, t in enumerate(self.queue)
                     if t.track_id == current.track_id), 0
                )
        self._notify("shuffle_changed")

    def _shuffle_queue(self):
        current = self.current_track
        remaining = [t for t in self.queue if t != current]
        random.shuffle(remaining)
        if current:
            self.queue = [current] + remaining
            self.queue_index = 0
        else:
            self.queue = remaining`,

    keyQuestions: [
      {
        question: 'How do you implement shuffle that feels random but fair?',
        answer: `Standard Fisher-Yates shuffle can produce sequences that feel non-random (e.g., the same artist playing three times in a row). Spotify uses a "spread" algorithm that ensures variety. After shuffling, they check for consecutive tracks by the same artist and spread them apart.

Another approach is weighted shuffle: tracks are assigned random weights, but recently played tracks get lower weights, and tracks from different artists/genres get bonus weights for diversity. The queue is sorted by these weights. This produces a sequence that feels more random to humans because it avoids clusters. The Strategy pattern lets you swap between simple Fisher-Yates and smart shuffle algorithms.`
      },
      {
        question: 'How does the playback controller handle different repeat modes?',
        answer: `The playback controller maintains a RepeatMode enum (OFF, ALL, ONE). When a track ends and next_track() is called: in OFF mode, advance to the next track; if at the end of the queue, stop. In ALL mode, advance to the next track; if at the end, wrap to the beginning and optionally re-shuffle. In ONE mode, replay the current track from the beginning.

The previous_track() method has a UX consideration: if the current position is more than 3 seconds in, restart the current track instead of going to the previous one. Only on a second press (within 3 seconds) does it actually go back. This matches user expectations from physical media players and is a detail interviewers appreciate.`
      }
    ],

    tips: [
      'Use the Observer pattern for UI updates on playback state changes',
      'Implement shuffle with diversity constraints to avoid artist/genre clustering',
      'Store the original queue order so shuffle can be toggled without losing the playlist order',
      'Handle the "previous track" UX: restart current track if more than 3 seconds in',
      'Model playlists as ordered collections with efficient insert, remove, and reorder operations'
    ]
  },
  {
    id: 'notification-system-lld',
    title: 'Notification System',
    subtitle: 'Multi-Channel Alert Platform',
    icon: 'bell',
    color: '#f59e0b',
    difficulty: 'Easy',
    description: 'Design a notification system supporting email, SMS, push, and in-app notifications with user preferences.',

    introduction: `A notification system delivers alerts and messages to users through multiple channels: email, SMS, push notifications, and in-app alerts. Users configure their preferences for which channels to use and which notification types they want to receive. The system must handle high throughput, ensure delivery, and respect user preferences.

The core design uses a pipeline: event source triggers a notification, the system resolves the target user's preferences, selects appropriate channels, formats the message for each channel, and dispatches through channel-specific providers.`,

    coreEntities: [
      { name: 'Notification', description: 'A message to deliver with type, content, priority, and target user' },
      { name: 'NotificationTemplate', description: 'A reusable template with placeholders for different notification types' },
      { name: 'UserPreferences', description: 'User channel preferences and notification type opt-in/opt-out settings' },
      { name: 'Channel', description: 'Delivery channel interface (Email, SMS, Push, InApp)' },
      { name: 'NotificationDispatcher', description: 'Routes notifications to appropriate channels based on preferences' },
      { name: 'DeliveryTracker', description: 'Tracks delivery status and handles retries for failed deliveries' },
      { name: 'RateLimiter', description: 'Prevents notification spam by enforcing per-user rate limits' }
    ],

    designPatterns: [
      'Strategy Pattern: Channel-specific delivery strategies (EmailSender, SMSSender, PushSender)',
      'Observer Pattern: Listeners subscribe to events that trigger notifications',
      'Template Method: Common notification workflow with channel-specific formatting',
      'Decorator Pattern: Add features like rate limiting, deduplication, batching around the base dispatcher',
      'Factory Method: Create channel-specific notification objects from templates'
    ],

    implementation: `from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from collections import defaultdict

class NotificationType(Enum):
    ORDER_UPDATE = "order_update"
    MARKETING = "marketing"
    SECURITY = "security"
    SOCIAL = "social"

class ChannelType(Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"

class Priority(Enum):
    LOW = 0
    MEDIUM = 1
    HIGH = 2
    URGENT = 3

@dataclass
class Notification:
    notification_id: str
    user_id: str
    type: NotificationType
    title: str
    body: str
    priority: Priority = Priority.MEDIUM
    data: dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)

class UserPreferences:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.channels: dict = {
            ChannelType.EMAIL: True,
            ChannelType.SMS: False,
            ChannelType.PUSH: True,
            ChannelType.IN_APP: True,
        }
        self.type_settings: dict = {
            NotificationType.ORDER_UPDATE: True,
            NotificationType.MARKETING: False,
            NotificationType.SECURITY: True,
            NotificationType.SOCIAL: True,
        }

    def is_enabled(self, channel: ChannelType, notif_type: NotificationType) -> bool:
        return self.channels.get(channel, False) and self.type_settings.get(notif_type, True)

class NotificationChannel(ABC):
    @abstractmethod
    def send(self, notification: Notification, contact: str) -> bool:
        pass

class EmailChannel(NotificationChannel):
    def send(self, notification: Notification, contact: str) -> bool:
        print(f"Sending email to {contact}: {notification.title}")
        return True

class SMSChannel(NotificationChannel):
    def send(self, notification: Notification, contact: str) -> bool:
        print(f"Sending SMS to {contact}: {notification.body[:160]}")
        return True

class PushChannel(NotificationChannel):
    def send(self, notification: Notification, contact: str) -> bool:
        print(f"Sending push to device {contact}: {notification.title}")
        return True

class InAppChannel(NotificationChannel):
    def __init__(self):
        self.inbox: dict = defaultdict(list)

    def send(self, notification: Notification, contact: str) -> bool:
        self.inbox[notification.user_id].append(notification)
        return True

class RateLimiter:
    def __init__(self, max_per_hour: int = 10):
        self.max_per_hour = max_per_hour
        self._counts: dict = defaultdict(list)

    def is_allowed(self, user_id: str) -> bool:
        now = datetime.now()
        hour_ago = now.timestamp() - 3600
        self._counts[user_id] = [
            t for t in self._counts[user_id] if t > hour_ago
        ]
        if len(self._counts[user_id]) >= self.max_per_hour:
            return False
        self._counts[user_id].append(now.timestamp())
        return True

class NotificationService:
    def __init__(self):
        self.channels: dict = {
            ChannelType.EMAIL: EmailChannel(),
            ChannelType.SMS: SMSChannel(),
            ChannelType.PUSH: PushChannel(),
            ChannelType.IN_APP: InAppChannel(),
        }
        self.user_prefs: dict = {}
        self.rate_limiter = RateLimiter()
        self.delivery_log: list = []

    def send(self, notification: Notification) -> list:
        if not self.rate_limiter.is_allowed(notification.user_id):
            return [("rate_limited", None)]

        prefs = self.user_prefs.get(notification.user_id, UserPreferences(notification.user_id))
        results = []

        # Urgent bypasses preferences for security notifications
        channels_to_use = []
        if notification.priority == Priority.URGENT:
            channels_to_use = list(self.channels.keys())
        else:
            channels_to_use = [
                ch for ch in ChannelType
                if prefs.is_enabled(ch, notification.type)
            ]

        for channel_type in channels_to_use:
            channel = self.channels.get(channel_type)
            if channel:
                success = channel.send(notification, notification.user_id)
                results.append((channel_type.value, success))
                self.delivery_log.append({
                    "notification_id": notification.notification_id,
                    "channel": channel_type.value,
                    "success": success,
                    "timestamp": datetime.now()
                })
        return results`,

    keyQuestions: [
      {
        question: 'How do you handle notification delivery failures?',
        answer: `Implement a retry mechanism with exponential backoff. When a channel fails to deliver, the notification is placed in a retry queue with a delay. The first retry might be after 1 minute, the second after 5 minutes, the third after 30 minutes. After a maximum number of retries, the notification is moved to a dead-letter queue for manual review.

For critical notifications (security alerts, password resets), fall back to alternative channels. If push delivery fails, try email. If email fails, try SMS. This cascading fallback ensures important notifications reach the user. Track delivery rates per channel and set up alerts when a channel's failure rate exceeds a threshold, indicating a provider outage.`
      },
      {
        question: 'How do you prevent notification spam?',
        answer: `Multiple layers of protection: per-user rate limiting (max N notifications per hour), notification deduplication (do not send the same notification twice within a window), notification batching (group multiple similar notifications into a digest), and user preferences (allow users to opt out of non-essential categories).

Rate limiting uses a sliding window counter per user. Deduplication hashes the notification content and checks against recent sends. Batching is especially important for social notifications: instead of "User A liked your post" then "User B liked your post" then "User C liked your post," batch them into "User A, B, and 1 other liked your post." The Decorator pattern wraps the base dispatcher with rate limiting, deduplication, and batching layers.`
      }
    ],

    tips: [
      'Use the Strategy pattern for channel-specific delivery and formatting',
      'Implement rate limiting as a decorator around the dispatcher',
      'Support user preferences at both the channel and notification-type level',
      'Log all delivery attempts for debugging and analytics',
      'Handle urgent notifications (security alerts) by bypassing standard preferences'
    ]
  },
  {
    id: 'pub-sub',
    title: 'Pub Sub System',
    subtitle: 'Publish-Subscribe Message Broker',
    icon: 'share2',
    color: '#8b5cf6',
    difficulty: 'Medium',
    description: 'Design a publish-subscribe messaging system with topics, subscriptions, and guaranteed delivery.',

    introduction: `A publish-subscribe (pub/sub) system decouples message producers (publishers) from consumers (subscribers) through an intermediary broker. Publishers send messages to named topics without knowing who will receive them. Subscribers express interest in topics and receive all messages published to those topics. This decoupling enables scalable, loosely coupled architectures.

The system must handle topic management, subscription lifecycle, message routing, delivery guarantees (at-least-once, at-most-once, exactly-once), and consumer group load balancing.`,

    coreEntities: [
      { name: 'Topic', description: 'A named channel that publishers send messages to and subscribers listen on' },
      { name: 'Message', description: 'A unit of data with payload, metadata, and unique ID' },
      { name: 'Publisher', description: 'A client that sends messages to topics' },
      { name: 'Subscriber', description: 'A client that receives messages from subscribed topics' },
      { name: 'Subscription', description: 'A link between a subscriber and a topic with delivery settings' },
      { name: 'MessageBroker', description: 'Central component managing topics, subscriptions, and message routing' },
      { name: 'MessageQueue', description: 'Per-subscriber buffer holding undelivered messages' },
      { name: 'AcknowledgmentTracker', description: 'Tracks message acknowledgments for delivery guarantees' }
    ],

    designPatterns: [
      'Observer Pattern: Core pub/sub mechanism for topic-based notification',
      'Strategy Pattern: Different delivery guarantee strategies (at-most-once, at-least-once)',
      'Iterator Pattern: Subscribers pull messages from their queues',
      'Factory Method: Create different message types and subscriptions',
      'Command Pattern: Messages as command objects that can be retried and dead-lettered'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime
from threading import Lock
from collections import defaultdict, deque
from typing import Callable, Optional
import uuid

@dataclass
class Message:
    message_id: str
    topic: str
    payload: dict
    timestamp: datetime = field(default_factory=datetime.now)
    headers: dict = field(default_factory=dict)

class Topic:
    def __init__(self, name: str, max_retention: int = 1000):
        self.name = name
        self.subscribers: dict = {}  # subscriber_id -> callback
        self.message_log: deque = deque(maxlen=max_retention)
        self._lock = Lock()

    def add_subscriber(self, subscriber_id: str, callback: Callable):
        with self._lock:
            self.subscribers[subscriber_id] = callback

    def remove_subscriber(self, subscriber_id: str):
        with self._lock:
            self.subscribers.pop(subscriber_id, None)

    def publish(self, message: Message) -> int:
        with self._lock:
            self.message_log.append(message)
            delivered = 0
            for sub_id, callback in self.subscribers.items():
                try:
                    callback(message)
                    delivered += 1
                except Exception:
                    pass  # Handle retry in production
            return delivered

class Subscription:
    def __init__(self, subscriber_id: str, topic_name: str):
        self.subscriber_id = subscriber_id
        self.topic_name = topic_name
        self.pending_messages: deque = deque()
        self.acknowledged: set = set()
        self.created_at = datetime.now()

class MessageBroker:
    def __init__(self):
        self.topics: dict = {}
        self.subscriptions: dict = defaultdict(dict)  # subscriber_id -> {topic: Subscription}
        self._lock = Lock()

    def create_topic(self, name: str) -> Topic:
        with self._lock:
            if name not in self.topics:
                self.topics[name] = Topic(name)
            return self.topics[name]

    def delete_topic(self, name: str):
        with self._lock:
            self.topics.pop(name, None)

    def subscribe(self, subscriber_id: str, topic_name: str,
                  callback: Callable) -> bool:
        topic = self.topics.get(topic_name)
        if not topic:
            return False

        sub = Subscription(subscriber_id, topic_name)
        self.subscriptions[subscriber_id][topic_name] = sub

        def wrapped_callback(msg: Message):
            sub.pending_messages.append(msg)
            callback(msg)

        topic.add_subscriber(subscriber_id, wrapped_callback)
        return True

    def unsubscribe(self, subscriber_id: str, topic_name: str):
        topic = self.topics.get(topic_name)
        if topic:
            topic.remove_subscriber(subscriber_id)
        if subscriber_id in self.subscriptions:
            self.subscriptions[subscriber_id].pop(topic_name, None)

    def publish(self, topic_name: str, payload: dict,
                headers: dict = None) -> Optional[str]:
        topic = self.topics.get(topic_name)
        if not topic:
            return None
        msg = Message(
            message_id=str(uuid.uuid4()),
            topic=topic_name,
            payload=payload,
            headers=headers or {}
        )
        topic.publish(msg)
        return msg.message_id

    def acknowledge(self, subscriber_id: str, topic_name: str,
                    message_id: str):
        sub = self.subscriptions.get(subscriber_id, {}).get(topic_name)
        if sub:
            sub.acknowledged.add(message_id)
            sub.pending_messages = deque(
                m for m in sub.pending_messages
                if m.message_id != message_id
            )

    def list_topics(self) -> list:
        return list(self.topics.keys())`,

    keyQuestions: [
      {
        question: 'How do you implement different delivery guarantees?',
        answer: `At-most-once: fire and forget. Publish the message to subscribers without waiting for acknowledgment. If delivery fails, the message is lost. This is the simplest and fastest, suitable for non-critical metrics and logging.

At-least-once: the broker persists the message and tracks acknowledgments. If a subscriber does not acknowledge within a timeout, the broker redelivers. This ensures no message is lost but may result in duplicates. Subscribers must be idempotent.

Exactly-once: the gold standard but the hardest to achieve. Requires deduplication on the subscriber side (using message IDs to detect redeliveries) combined with at-least-once delivery. Some systems achieve this through transactional outbox patterns or two-phase commits.`
      },
      {
        question: 'How do consumer groups enable load balancing?',
        answer: `In a consumer group, multiple subscribers share a subscription. Each message is delivered to exactly one subscriber in the group, distributing the processing load. Without consumer groups, every subscriber receives every message (fan-out). With consumer groups, the broker partitions messages among group members.

Implementation: partition the topic into segments. Assign each partition to one consumer in the group. If a consumer fails, reassign its partitions to remaining consumers (rebalancing). This is the model used by Kafka and similar systems. The broker tracks which consumer owns which partition and delivers messages from each partition to its assigned consumer.`
      }
    ],

    tips: [
      'Persist messages to disk for durability; in-memory queues lose data on crashes',
      'Implement acknowledgment timeouts with automatic redelivery for at-least-once guarantees',
      'Support both push (broker delivers to subscriber) and pull (subscriber polls from broker) models',
      'Use consumer groups for horizontal scaling of message processing',
      'Add dead-letter topics for messages that fail delivery after maximum retries'
    ]
  },
  {
    id: 'chat-application',
    title: 'Chat Application',
    subtitle: 'Real-Time Messaging System',
    icon: 'messageSquare',
    color: '#06b6d4',
    difficulty: 'Medium',
    description: 'Design a real-time chat application supporting one-on-one and group messaging with delivery receipts.',

    introduction: `A chat application enables real-time text messaging between users in one-on-one and group conversations. It must handle message ordering, delivery status tracking (sent, delivered, read), offline message queuing, and real-time notification. The system supports typing indicators, media attachments, and message history with pagination.

The core challenge is maintaining message ordering in distributed systems, efficiently delivering messages to online users while queuing for offline users, and scaling WebSocket connections across multiple servers.`,

    coreEntities: [
      { name: 'User', description: 'A chat participant with online status and device information' },
      { name: 'Conversation', description: 'A chat thread between two or more users' },
      { name: 'Message', description: 'A text or media message with sender, timestamp, and delivery status' },
      { name: 'MessageStatus', description: 'Tracks sent, delivered, and read status per recipient' },
      { name: 'GroupConversation', description: 'A conversation with multiple participants and admin controls' },
      { name: 'PresenceService', description: 'Tracks user online/offline status and last-seen timestamps' },
      { name: 'MessageQueue', description: 'Stores messages for offline users until they reconnect' },
      { name: 'ConnectionManager', description: 'Manages WebSocket connections and routes messages to connected users' }
    ],

    designPatterns: [
      'Observer Pattern: Real-time message delivery and presence updates',
      'Mediator Pattern: Chat server mediates all communication between participants',
      'Strategy Pattern: Different storage strategies for different message types (text, image, file)',
      'State Pattern: Message delivery states (Sent, Delivered, Read)',
      'Command Pattern: Message operations (send, edit, delete, react) as reversible commands'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from collections import defaultdict
from typing import Optional
import uuid

class DeliveryStatus(Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"

class UserStatus(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    AWAY = "away"

@dataclass
class Message:
    message_id: str
    conversation_id: str
    sender_id: str
    content: str
    message_type: str = "text"  # text, image, file
    timestamp: datetime = field(default_factory=datetime.now)
    edited: bool = False
    deleted: bool = False

@dataclass
class Conversation:
    conversation_id: str
    participants: list
    messages: list = field(default_factory=list)
    is_group: bool = False
    name: str = ""
    created_at: datetime = field(default_factory=datetime.now)

class PresenceService:
    def __init__(self):
        self._status: dict = {}
        self._last_seen: dict = {}
        self._observers: list = []

    def set_online(self, user_id: str):
        self._status[user_id] = UserStatus.ONLINE
        self._notify(user_id, UserStatus.ONLINE)

    def set_offline(self, user_id: str):
        self._status[user_id] = UserStatus.OFFLINE
        self._last_seen[user_id] = datetime.now()
        self._notify(user_id, UserStatus.OFFLINE)

    def is_online(self, user_id: str) -> bool:
        return self._status.get(user_id) == UserStatus.ONLINE

    def get_last_seen(self, user_id: str) -> Optional[datetime]:
        return self._last_seen.get(user_id)

    def add_observer(self, observer):
        self._observers.append(observer)

    def _notify(self, user_id: str, status: UserStatus):
        for obs in self._observers:
            obs.on_presence_change(user_id, status)

class ChatService:
    def __init__(self):
        self.conversations: dict = {}
        self.user_conversations: dict = defaultdict(set)
        self.presence = PresenceService()
        self.delivery_status: dict = defaultdict(dict)  # msg_id -> {user_id: status}
        self.offline_queue: dict = defaultdict(list)
        self._message_listeners: dict = defaultdict(list)

    def create_conversation(self, participants: list,
                            is_group: bool = False,
                            name: str = "") -> Conversation:
        conv = Conversation(
            conversation_id=str(uuid.uuid4()),
            participants=participants,
            is_group=is_group,
            name=name
        )
        self.conversations[conv.conversation_id] = conv
        for p in participants:
            self.user_conversations[p].add(conv.conversation_id)
        return conv

    def send_message(self, sender_id: str, conversation_id: str,
                     content: str, message_type: str = "text") -> Message:
        conv = self.conversations.get(conversation_id)
        if not conv or sender_id not in conv.participants:
            raise ValueError("Invalid conversation or sender")

        msg = Message(
            message_id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
            message_type=message_type
        )
        conv.messages.append(msg)

        # Deliver to recipients
        for participant in conv.participants:
            if participant == sender_id:
                continue
            if self.presence.is_online(participant):
                self._deliver(participant, msg)
                self.delivery_status[msg.message_id][participant] = DeliveryStatus.DELIVERED
            else:
                self.offline_queue[participant].append(msg)
                self.delivery_status[msg.message_id][participant] = DeliveryStatus.SENT

        return msg

    def mark_read(self, user_id: str, message_id: str):
        if message_id in self.delivery_status:
            self.delivery_status[message_id][user_id] = DeliveryStatus.READ

    def get_history(self, conversation_id: str, limit: int = 50,
                    before: datetime = None) -> list:
        conv = self.conversations.get(conversation_id)
        if not conv:
            return []
        messages = conv.messages
        if before:
            messages = [m for m in messages if m.timestamp < before]
        return sorted(messages, key=lambda m: m.timestamp, reverse=True)[:limit]

    def deliver_offline_messages(self, user_id: str) -> list:
        messages = self.offline_queue.pop(user_id, [])
        for msg in messages:
            self._deliver(user_id, msg)
            self.delivery_status[msg.message_id][user_id] = DeliveryStatus.DELIVERED
        return messages

    def _deliver(self, user_id: str, message: Message):
        for listener in self._message_listeners.get(user_id, []):
            listener(message)

    def register_listener(self, user_id: str, callback):
        self._message_listeners[user_id].append(callback)`,

    keyQuestions: [
      {
        question: 'How do you handle message ordering in a distributed system?',
        answer: `Use server-assigned timestamps or sequence numbers for global ordering. Each message receives a monotonically increasing sequence number when it reaches the server, ensuring a total order within each conversation. Client-side timestamps are unreliable (clocks drift, timezones differ) and should only be used as a hint, not for ordering.

For conversations spread across multiple servers, use a distributed sequence generator (Snowflake IDs) that embeds the timestamp and server ID. This provides approximate ordering across servers. Within a single conversation, strict ordering is enforced by serializing writes through a single partition (all messages for one conversation go to the same server).`
      },
      {
        question: 'How do you implement read receipts efficiently?',
        answer: `Track delivery status per message per recipient. When a recipient opens the conversation, batch-update all unread messages to "read" status. Do not send individual read receipt updates for each message; instead, send a single "read up to message ID X" event.

On the sender side, display the minimum status across all recipients for group chats: if 3 of 5 recipients have read the message, show double-check (delivered to all) rather than blue-check (read by all). Store status as a compact bitmap or use a watermark approach: "user Y has read all messages up to timestamp T." This avoids storing per-message-per-user status for every message in long conversations.`
      }
    ],

    tips: [
      'Use server-assigned sequence numbers for message ordering, not client timestamps',
      'Queue messages for offline users and deliver them on reconnection',
      'Batch read receipt updates ("read up to message X") instead of per-message updates',
      'Implement typing indicators as ephemeral events that are not persisted',
      'Paginate message history with cursor-based pagination (before: messageId) for consistent results'
    ]
  },
  {
    id: 'payment-gateway-lld',
    title: 'Payment Gateway',
    subtitle: 'Payment Processing System',
    icon: 'creditCard',
    color: '#10b981',
    difficulty: 'Medium',
    description: 'Design a payment gateway supporting multiple payment methods, idempotent processing, and refund handling.',

    introduction: `A payment gateway processes financial transactions between merchants and customers. It must support multiple payment methods (credit card, debit card, UPI, wallet), ensure idempotent processing (prevent duplicate charges), handle the complete payment lifecycle (authorize, capture, refund, void), and maintain detailed audit trails for compliance.

The system must handle the critical requirement of exactly-once payment processing in a distributed environment where network failures, timeouts, and retries are common. An idempotency key ensures that retrying a failed request does not result in a double charge.`,

    coreEntities: [
      { name: 'Payment', description: 'A payment transaction with amount, currency, method, and lifecycle status' },
      { name: 'PaymentMethod', description: 'Abstract payment method: CreditCard, DebitCard, UPI, Wallet' },
      { name: 'PaymentProcessor', description: 'Processes payments through appropriate provider (Stripe, PayPal, bank)' },
      { name: 'IdempotencyManager', description: 'Ensures each payment request is processed exactly once' },
      { name: 'TransactionLog', description: 'Immutable audit log of all payment events' },
      { name: 'RefundProcessor', description: 'Handles full and partial refunds' },
      { name: 'PaymentGateway', description: 'Main entry point coordinating payment workflow' }
    ],

    designPatterns: [
      'Strategy Pattern: Different payment processors for different methods (Stripe, PayPal, bank API)',
      'State Pattern: Payment lifecycle states (Created, Authorized, Captured, Refunded, Failed, Voided)',
      'Command Pattern: Payment operations as commands for audit trail and potential reversal',
      'Factory Method: Create payment processor based on payment method type',
      'Template Method: Common payment workflow with method-specific authorization steps'
    ],

    implementation: `from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
import uuid

class PaymentStatus(Enum):
    CREATED = "created"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    VOIDED = "voided"

@dataclass
class Payment:
    payment_id: str
    merchant_id: str
    amount: float
    currency: str
    method_type: str  # credit_card, upi, wallet
    status: PaymentStatus = PaymentStatus.CREATED
    idempotency_key: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    captured_at: Optional[datetime] = None
    refunded_amount: float = 0.0
    metadata: dict = field(default_factory=dict)

class PaymentProcessor(ABC):
    @abstractmethod
    def authorize(self, payment: Payment, details: dict) -> dict:
        pass

    @abstractmethod
    def capture(self, payment: Payment) -> dict:
        pass

    @abstractmethod
    def refund(self, payment: Payment, amount: float) -> dict:
        pass

class CreditCardProcessor(PaymentProcessor):
    def authorize(self, payment: Payment, details: dict) -> dict:
        # Simulate card authorization
        return {"success": True, "auth_code": f"AUTH-{uuid.uuid4().hex[:8]}"}

    def capture(self, payment: Payment) -> dict:
        return {"success": True, "capture_id": f"CAP-{uuid.uuid4().hex[:8]}"}

    def refund(self, payment: Payment, amount: float) -> dict:
        return {"success": True, "refund_id": f"REF-{uuid.uuid4().hex[:8]}"}

class IdempotencyManager:
    def __init__(self):
        self._cache: dict = {}  # idempotency_key -> response

    def check(self, key: str) -> Optional[dict]:
        return self._cache.get(key)

    def store(self, key: str, response: dict):
        self._cache[key] = response

class PaymentGateway:
    def __init__(self):
        self.processors: dict = {
            "credit_card": CreditCardProcessor(),
        }
        self.payments: dict = {}
        self.idempotency = IdempotencyManager()
        self.transaction_log: list = []

    def _log_event(self, payment_id: str, event: str, details: dict):
        self.transaction_log.append({
            "payment_id": payment_id,
            "event": event,
            "details": details,
            "timestamp": datetime.now()
        })

    def create_payment(self, merchant_id: str, amount: float,
                       currency: str, method_type: str,
                       idempotency_key: str = None) -> Payment:
        if idempotency_key:
            existing = self.idempotency.check(idempotency_key)
            if existing:
                return self.payments[existing["payment_id"]]

        payment = Payment(
            payment_id=str(uuid.uuid4()),
            merchant_id=merchant_id,
            amount=amount,
            currency=currency,
            method_type=method_type,
            idempotency_key=idempotency_key
        )
        self.payments[payment.payment_id] = payment
        self._log_event(payment.payment_id, "created", {"amount": amount})

        if idempotency_key:
            self.idempotency.store(idempotency_key, {"payment_id": payment.payment_id})
        return payment

    def authorize(self, payment_id: str, details: dict) -> dict:
        payment = self.payments[payment_id]
        processor = self.processors.get(payment.method_type)
        if not processor:
            raise ValueError(f"No processor for {payment.method_type}")

        result = processor.authorize(payment, details)
        if result["success"]:
            payment.status = PaymentStatus.AUTHORIZED
            self._log_event(payment_id, "authorized", result)
        else:
            payment.status = PaymentStatus.FAILED
            self._log_event(payment_id, "auth_failed", result)
        return result

    def capture(self, payment_id: str) -> dict:
        payment = self.payments[payment_id]
        if payment.status != PaymentStatus.AUTHORIZED:
            raise ValueError("Payment must be authorized before capture")

        processor = self.processors[payment.method_type]
        result = processor.capture(payment)
        if result["success"]:
            payment.status = PaymentStatus.CAPTURED
            payment.captured_at = datetime.now()
            self._log_event(payment_id, "captured", result)
        return result

    def refund(self, payment_id: str, amount: float = None) -> dict:
        payment = self.payments[payment_id]
        if payment.status not in (PaymentStatus.CAPTURED, PaymentStatus.PARTIALLY_REFUNDED):
            raise ValueError("Can only refund captured payments")

        refund_amount = amount or payment.amount
        max_refundable = payment.amount - payment.refunded_amount
        if refund_amount > max_refundable:
            raise ValueError(f"Max refundable: {max_refundable}")

        processor = self.processors[payment.method_type]
        result = processor.refund(payment, refund_amount)
        if result["success"]:
            payment.refunded_amount += refund_amount
            if payment.refunded_amount >= payment.amount:
                payment.status = PaymentStatus.REFUNDED
            else:
                payment.status = PaymentStatus.PARTIALLY_REFUNDED
            self._log_event(payment_id, "refunded", {
                "amount": refund_amount, **result
            })
        return result`,

    keyQuestions: [
      {
        question: 'How do you ensure idempotent payment processing?',
        answer: `Every payment request includes an idempotency key (typically a UUID generated by the client). Before processing, the gateway checks if a response for this key already exists. If so, it returns the cached response without processing again. If not, it processes the request and caches the response.

This prevents double charges when a client retries a request after a network timeout. The client does not know if the first request succeeded or failed, so it retries with the same idempotency key. If the first request succeeded, the retry returns the cached success response. If the first request truly failed, the retry processes normally. The idempotency cache must be durable (persisted to database) and should expire after a reasonable period (24-48 hours).`
      },
      {
        question: 'What is the authorize-then-capture flow and why is it used?',
        answer: `Authorization verifies the payment method and reserves funds without actually transferring money. Capture completes the transfer. This two-step process is used when there is a delay between the customer placing an order and the merchant fulfilling it.

For example, an e-commerce site authorizes the credit card at checkout (verifying the card is valid and funds are available). The funds are held but not charged. When the item ships, the merchant captures the payment. If the item is out of stock, the merchant voids the authorization, and the held funds are released. This protects both the customer (not charged for unshipped items) and the merchant (guaranteed funds when ready to ship).`
      }
    ],

    tips: [
      'Always use idempotency keys to prevent duplicate charges on retry',
      'Implement the authorize-capture flow for e-commerce use cases',
      'Maintain an immutable transaction log for audit compliance',
      'Support partial refunds by tracking the total refunded amount',
      'Use the Strategy pattern for different payment processors to enable adding new payment methods'
    ]
  },
  {
    id: 'food-delivery',
    title: 'Online Food Delivery',
    subtitle: 'Food Ordering and Delivery Platform',
    icon: 'truck',
    color: '#ef4444',
    difficulty: 'Hard',
    description: 'Design a food delivery platform connecting customers, restaurants, and delivery drivers.',

    introduction: `An online food delivery platform coordinates three actors: customers who order food, restaurants that prepare it, and delivery drivers who transport it. The system handles restaurant discovery, menu browsing, order placement, real-time order tracking, driver assignment, and payment processing.

The core challenge is orchestrating the three-party workflow: customer places order, restaurant confirms and prepares, driver is assigned and picks up, driver delivers to customer. Each party has its own view and interactions, and the system must handle failures at any stage (restaurant rejects, driver unavailable, customer cancels).`,

    coreEntities: [
      { name: 'Customer', description: 'A user who browses restaurants and places food orders' },
      { name: 'Restaurant', description: 'A food provider with menu, operating hours, and preparation capacity' },
      { name: 'DeliveryDriver', description: 'A driver with vehicle, location, and availability status' },
      { name: 'Menu', description: 'A restaurant menu with categories and menu items' },
      { name: 'Order', description: 'A customer food order with items, restaurant, delivery address, and status' },
      { name: 'OrderItem', description: 'A single item in an order with quantity and customizations' },
      { name: 'DriverDispatcher', description: 'Assigns available drivers to orders based on proximity and load' },
      { name: 'OrderTracker', description: 'Provides real-time order status and driver location updates' },
      { name: 'PaymentService', description: 'Handles payment processing and driver/restaurant payouts' },
      { name: 'RatingService', description: 'Manages customer ratings for restaurants and drivers' }
    ],

    designPatterns: [
      'State Pattern: Order states (Placed, Confirmed, Preparing, ReadyForPickup, InTransit, Delivered, Cancelled)',
      'Observer Pattern: Real-time order status updates to customers',
      'Strategy Pattern: Driver assignment algorithms (nearest, least-busy, highest-rated)',
      'Mediator Pattern: Platform mediates interactions between customers, restaurants, and drivers',
      'Command Pattern: Order operations (place, modify, cancel) as reversible commands',
      'Factory Method: Create different order types (delivery, pickup, scheduled)'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
import math
import uuid

class OrderStatus(Enum):
    PLACED = "placed"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY_FOR_PICKUP = "ready_for_pickup"
    DRIVER_ASSIGNED = "driver_assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class DriverStatus(Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    PICKING_UP = "picking_up"
    DELIVERING = "delivering"
    OFFLINE = "offline"

@dataclass
class Location:
    lat: float
    lng: float

    def distance_to(self, other: 'Location') -> float:
        return math.sqrt((self.lat - other.lat)**2 + (self.lng - other.lng)**2)

@dataclass
class MenuItem:
    item_id: str
    name: str
    price: float
    description: str
    is_available: bool = True

@dataclass
class Restaurant:
    restaurant_id: str
    name: str
    location: Location
    menu_items: dict = field(default_factory=dict)
    is_open: bool = True
    avg_prep_time: int = 20  # minutes

@dataclass
class DeliveryDriver:
    driver_id: str
    name: str
    location: Location
    status: DriverStatus = DriverStatus.OFFLINE
    current_order_id: Optional[str] = None
    rating: float = 5.0

@dataclass
class Order:
    order_id: str
    customer_id: str
    restaurant_id: str
    items: list
    delivery_address: Location
    status: OrderStatus = OrderStatus.PLACED
    driver_id: Optional[str] = None
    total_amount: float = 0.0
    created_at: datetime = field(default_factory=datetime.now)
    estimated_delivery: Optional[datetime] = None

class DriverDispatcher:
    def __init__(self):
        self.drivers: dict = {}

    def register_driver(self, driver: DeliveryDriver):
        self.drivers[driver.driver_id] = driver

    def find_nearest_available(self, restaurant_location: Location,
                                max_distance: float = 5.0) -> Optional[DeliveryDriver]:
        available = [
            d for d in self.drivers.values()
            if d.status == DriverStatus.AVAILABLE
        ]
        if not available:
            return None

        available.sort(key=lambda d: d.location.distance_to(restaurant_location))
        for driver in available:
            if driver.location.distance_to(restaurant_location) <= max_distance:
                return driver
        return None

    def assign_driver(self, driver_id: str, order_id: str):
        driver = self.drivers[driver_id]
        driver.status = DriverStatus.ASSIGNED
        driver.current_order_id = order_id

class FoodDeliveryPlatform:
    def __init__(self):
        self.restaurants: dict = {}
        self.orders: dict = {}
        self.dispatcher = DriverDispatcher()
        self._observers: dict = {}  # order_id -> [callbacks]

    def register_restaurant(self, restaurant: Restaurant):
        self.restaurants[restaurant.restaurant_id] = restaurant

    def place_order(self, customer_id: str, restaurant_id: str,
                    items: list, delivery_address: Location) -> Order:
        restaurant = self.restaurants[restaurant_id]
        if not restaurant.is_open:
            raise ValueError("Restaurant is closed")

        total = sum(
            restaurant.menu_items[item_id].price * qty
            for item_id, qty in items
        )

        order = Order(
            order_id=str(uuid.uuid4()),
            customer_id=customer_id,
            restaurant_id=restaurant_id,
            items=items,
            delivery_address=delivery_address,
            total_amount=total
        )
        self.orders[order.order_id] = order
        self._notify(order.order_id, "order_placed", order.status)
        return order

    def confirm_order(self, order_id: str, prep_time: int = None):
        order = self.orders[order_id]
        order.status = OrderStatus.CONFIRMED
        self._notify(order_id, "order_confirmed", order.status)

        # Try to assign a driver
        restaurant = self.restaurants[order.restaurant_id]
        driver = self.dispatcher.find_nearest_available(restaurant.location)
        if driver:
            self.dispatcher.assign_driver(driver.driver_id, order_id)
            order.driver_id = driver.driver_id
            order.status = OrderStatus.DRIVER_ASSIGNED
            self._notify(order_id, "driver_assigned", order.status)

    def update_status(self, order_id: str, new_status: OrderStatus):
        order = self.orders[order_id]
        order.status = new_status
        if new_status == OrderStatus.DELIVERED:
            driver = self.dispatcher.drivers.get(order.driver_id)
            if driver:
                driver.status = DriverStatus.AVAILABLE
                driver.current_order_id = None
        self._notify(order_id, "status_update", new_status)

    def subscribe_order(self, order_id: str, callback):
        if order_id not in self._observers:
            self._observers[order_id] = []
        self._observers[order_id].append(callback)

    def _notify(self, order_id: str, event: str, data):
        for cb in self._observers.get(order_id, []):
            cb(event, data)`,

    keyQuestions: [
      {
        question: 'How do you assign drivers to orders efficiently?',
        answer: `The simplest approach is nearest-available: find the available driver closest to the restaurant. This minimizes pickup time but does not consider the driver's current trajectory or order load.

A better approach considers multiple factors: distance to restaurant (minimize pickup time), driver's route compatibility (a driver heading toward the restaurant is better even if further), current order load (balance across drivers), driver rating (higher-rated drivers get priority orders). The Strategy pattern lets you implement and swap these algorithms. For real-time optimization, a dispatching service can batch pending orders and run a matching algorithm every few seconds, optimizing globally rather than greedily assigning one at a time.`
      },
      {
        question: 'How do you handle order cancellations at different stages?',
        answer: `Cancellation rules depend on the order status. At PLACED: free cancellation, full refund. At CONFIRMED: partial refund (restaurant may have started prep). At PREPARING: possible cancellation with penalty. At READY_FOR_PICKUP or later: generally not cancellable; if the driver has already picked up, the food cannot be returned.

Implement this with the State pattern: each state's cancel() method enforces the appropriate policy. The PLACED state allows free cancellation. The PREPARING state checks how far along preparation is. The IN_TRANSIT state rejects cancellation. Each state returns a result indicating whether cancellation was allowed and what refund (if any) applies.`
      }
    ],

    tips: [
      'Model the order lifecycle as a state machine with well-defined valid transitions',
      'Assign drivers using a strategy that considers distance, load, and route compatibility',
      'Implement real-time order tracking using WebSocket/SSE with the Observer pattern',
      'Handle cancellation rules differently based on order status (State pattern)',
      'Calculate estimated delivery time from restaurant prep time + driver pickup time + delivery distance'
    ]
  },
  {
    id: 'ride-hailing',
    title: 'Ride Hailing Service',
    subtitle: 'On-Demand Transportation Platform',
    icon: 'navigation',
    color: '#000000',
    difficulty: 'Hard',
    description: 'Design a ride hailing platform matching riders with nearby drivers, computing fares, and tracking trips.',

    introduction: `A ride hailing service connects riders who need transportation with nearby drivers. The system must handle real-time driver location tracking, efficient rider-driver matching, dynamic fare calculation, trip lifecycle management, and post-trip rating. The core technical challenge is the geospatial matching: finding the best available driver near a rider's location in real-time.

The platform manages the complete trip lifecycle from ride request through driver assignment, pickup, transit, dropoff, payment, and rating, while handling edge cases like driver cancellations, no-shows, and fare disputes.`,

    coreEntities: [
      { name: 'Rider', description: 'A user requesting a ride with pickup and dropoff locations' },
      { name: 'Driver', description: 'A driver with vehicle info, location, availability, and rating' },
      { name: 'Ride', description: 'A trip from pickup to dropoff with fare, status, and assigned driver' },
      { name: 'RideRequest', description: 'A rider request with locations, vehicle preference, and fare estimate' },
      { name: 'DriverMatcher', description: 'Matches ride requests with nearby available drivers' },
      { name: 'FareCalculator', description: 'Computes trip fare based on distance, time, demand, and vehicle type' },
      { name: 'LocationTracker', description: 'Tracks real-time driver locations using geospatial indexing' },
      { name: 'TripTracker', description: 'Provides real-time trip progress and ETA updates' },
      { name: 'PaymentService', description: 'Processes rider payments and driver payouts' },
      { name: 'RatingService', description: 'Manages mutual ratings between riders and drivers' }
    ],

    designPatterns: [
      'Strategy Pattern: Fare calculation algorithms (standard, surge, flat rate), matching algorithms',
      'State Pattern: Ride states (Requested, DriverAssigned, DriverArrived, InProgress, Completed, Cancelled)',
      'Observer Pattern: Real-time ride status and location updates',
      'Factory Method: Create ride objects based on vehicle type (economy, premium, shared)',
      'Command Pattern: Ride operations (request, cancel, update destination) as commands'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
from abc import ABC, abstractmethod
import math
import uuid

class RideStatus(Enum):
    REQUESTED = "requested"
    DRIVER_ASSIGNED = "driver_assigned"
    DRIVER_ARRIVED = "driver_arrived"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class VehicleType(Enum):
    ECONOMY = "economy"
    PREMIUM = "premium"
    XL = "xl"

@dataclass
class Location:
    lat: float
    lng: float

    def distance_km(self, other: 'Location') -> float:
        R = 6371
        d_lat = math.radians(other.lat - self.lat)
        d_lng = math.radians(other.lng - self.lng)
        a = (math.sin(d_lat/2)**2 +
             math.cos(math.radians(self.lat)) *
             math.cos(math.radians(other.lat)) *
             math.sin(d_lng/2)**2)
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

@dataclass
class Driver:
    driver_id: str
    name: str
    vehicle_type: VehicleType
    location: Location
    is_available: bool = True
    rating: float = 5.0
    total_rides: int = 0

@dataclass
class Ride:
    ride_id: str
    rider_id: str
    pickup: Location
    dropoff: Location
    vehicle_type: VehicleType
    status: RideStatus = RideStatus.REQUESTED
    driver_id: Optional[str] = None
    fare_estimate: float = 0.0
    actual_fare: float = 0.0
    distance_km: float = 0.0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class FareStrategy(ABC):
    @abstractmethod
    def calculate(self, distance_km: float, duration_min: float,
                  vehicle_type: VehicleType) -> float:
        pass

class StandardFare(FareStrategy):
    BASE_FARE = {VehicleType.ECONOMY: 2.0, VehicleType.PREMIUM: 5.0, VehicleType.XL: 4.0}
    PER_KM = {VehicleType.ECONOMY: 1.0, VehicleType.PREMIUM: 2.0, VehicleType.XL: 1.5}
    PER_MIN = {VehicleType.ECONOMY: 0.15, VehicleType.PREMIUM: 0.30, VehicleType.XL: 0.20}

    def calculate(self, distance_km, duration_min, vehicle_type) -> float:
        fare = (self.BASE_FARE[vehicle_type] +
                distance_km * self.PER_KM[vehicle_type] +
                duration_min * self.PER_MIN[vehicle_type])
        return round(max(fare, self.BASE_FARE[vehicle_type] * 2), 2)

class SurgeFare(FareStrategy):
    def __init__(self, base_strategy: FareStrategy, multiplier: float):
        self.base = base_strategy
        self.multiplier = multiplier

    def calculate(self, distance_km, duration_min, vehicle_type) -> float:
        return round(self.base.calculate(distance_km, duration_min, vehicle_type)
                     * self.multiplier, 2)

class RideService:
    def __init__(self):
        self.drivers: dict = {}
        self.rides: dict = {}
        self.fare_strategy: FareStrategy = StandardFare()
        self._observers: dict = {}

    def register_driver(self, driver: Driver):
        self.drivers[driver.driver_id] = driver

    def set_fare_strategy(self, strategy: FareStrategy):
        self.fare_strategy = strategy

    def request_ride(self, rider_id: str, pickup: Location,
                     dropoff: Location,
                     vehicle_type: VehicleType = VehicleType.ECONOMY) -> Ride:
        distance = pickup.distance_km(dropoff)
        est_duration = distance / 0.5  # assume 30 km/h avg
        fare_estimate = self.fare_strategy.calculate(distance, est_duration, vehicle_type)

        ride = Ride(
            ride_id=str(uuid.uuid4()),
            rider_id=rider_id,
            pickup=pickup, dropoff=dropoff,
            vehicle_type=vehicle_type,
            fare_estimate=fare_estimate,
            distance_km=distance
        )
        self.rides[ride.ride_id] = ride

        driver = self._find_best_driver(pickup, vehicle_type)
        if driver:
            ride.driver_id = driver.driver_id
            ride.status = RideStatus.DRIVER_ASSIGNED
            driver.is_available = False
        return ride

    def _find_best_driver(self, location: Location,
                           vehicle_type: VehicleType) -> Optional[Driver]:
        candidates = [
            d for d in self.drivers.values()
            if d.is_available and d.vehicle_type == vehicle_type
        ]
        if not candidates:
            candidates = [d for d in self.drivers.values() if d.is_available]

        if not candidates:
            return None

        # Score by distance and rating
        def score(driver):
            dist = driver.location.distance_km(location)
            return dist - (driver.rating * 0.5)  # closer + higher rated = lower score

        candidates.sort(key=score)
        return candidates[0]

    def complete_ride(self, ride_id: str):
        ride = self.rides[ride_id]
        ride.status = RideStatus.COMPLETED
        ride.completed_at = datetime.now()
        ride.actual_fare = ride.fare_estimate  # In production, recalculate from actual route

        driver = self.drivers.get(ride.driver_id)
        if driver:
            driver.is_available = True
            driver.total_rides += 1`,

    keyQuestions: [
      {
        question: 'How do you implement surge pricing?',
        answer: `Surge pricing activates when demand exceeds supply in a geographic area. Divide the city into hexagonal cells (using H3 or similar geospatial indexing). For each cell, track the ratio of pending ride requests to available drivers. When this ratio exceeds a threshold (e.g., 2:1), apply a surge multiplier.

The surge multiplier is calculated as a function of the demand-supply ratio. A 2:1 ratio might trigger 1.5x, 3:1 triggers 2x, and so on. The Decorator or Strategy pattern applies: SurgeFare wraps StandardFare and multiplies the result. Show the surge multiplier to the rider before they confirm, allowing them to wait for lower prices. Update surge levels every few minutes to reflect changing conditions.`
      },
      {
        question: 'How do you efficiently match riders with nearby drivers?',
        answer: `Use a geospatial index (QuadTree, R-tree, or H3 hexagonal grid) to store driver locations. When a ride is requested, query the index for available drivers within a radius of the pickup point. Sort candidates by a scoring function that considers distance, driver rating, and vehicle type match.

For real-time location updates, drivers send their GPS coordinates every few seconds. The geospatial index is updated accordingly. At scale, shard the index by geographic region so each server handles a subset of the city. A matching service batches incoming requests and runs a global optimization every few seconds, minimizing total pickup distance across all pending requests rather than greedily matching one at a time.`
      }
    ],

    tips: [
      'Use geospatial indexing (H3 or QuadTree) for efficient nearby driver queries',
      'Implement fare calculation as a strategy to support standard, surge, and promotional pricing',
      'Model the ride lifecycle as a state machine with defined valid transitions',
      'Calculate ETA using real-time traffic data when available, with distance-based fallback',
      'Handle edge cases: no drivers available (queue request), driver cancellation (reassign), rider no-show (charge fee)'
    ]
  },
  {
    id: 'amazon-locker',
    title: 'Amazon Locker',
    subtitle: 'Package Pickup Locker System',
    icon: 'lock',
    color: '#f59e0b',
    difficulty: 'Medium',
    description: 'Design a self-service locker system for package pickup and returns with size-based allocation.',

    introduction: `An Amazon Locker system provides self-service package pickup and return at convenient locations. The system manages a network of locker locations, each with lockers of varying sizes (small, medium, large). When a package is ready, the system selects an appropriate locker at the customer's chosen location, assigns a pickup code, and the customer retrieves the package using the code within a time window.

The design involves locker size matching (selecting the smallest locker that fits the package), code generation and validation, time-window enforcement, and handling undelivered packages.`,

    coreEntities: [
      { name: 'LockerLocation', description: 'A physical site with multiple lockers of various sizes' },
      { name: 'Locker', description: 'An individual storage compartment with size, status, and assigned package' },
      { name: 'Package', description: 'A shipped item with dimensions, tracking number, and delivery info' },
      { name: 'PickupCode', description: 'A unique code for package retrieval with expiration time' },
      { name: 'LockerAllocationService', description: 'Assigns packages to appropriate lockers based on size and availability' },
      { name: 'NotificationService', description: 'Notifies customers when packages are ready for pickup' },
      { name: 'ReturnService', description: 'Handles package returns using available lockers' }
    ],

    designPatterns: [
      'Strategy Pattern: Locker allocation strategies (smallest-fit, nearest-location, load-balanced)',
      'State Pattern: Locker states (Available, Reserved, Occupied, Overdue, Maintenance)',
      'Observer Pattern: Notify customers of package availability and overdue warnings',
      'Factory Method: Generate different types of pickup codes (numeric, alphanumeric, QR)',
      'Template Method: Common pickup workflow with step-specific variations for different locker models'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional
import random
import string

class LockerSize(Enum):
    SMALL = 1
    MEDIUM = 2
    LARGE = 3

class LockerStatus(Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    OCCUPIED = "occupied"
    OVERDUE = "overdue"
    MAINTENANCE = "maintenance"

@dataclass
class Package:
    tracking_id: str
    customer_id: str
    width: float
    height: float
    depth: float
    weight: float

    def required_size(self) -> LockerSize:
        volume = self.width * self.height * self.depth
        if volume <= 5000 and self.weight <= 5:
            return LockerSize.SMALL
        elif volume <= 20000 and self.weight <= 20:
            return LockerSize.MEDIUM
        return LockerSize.LARGE

@dataclass
class Locker:
    locker_id: str
    location_id: str
    size: LockerSize
    status: LockerStatus = LockerStatus.AVAILABLE
    package_id: Optional[str] = None
    pickup_code: Optional[str] = None
    assigned_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    def can_fit(self, required_size: LockerSize) -> bool:
        return self.status == LockerStatus.AVAILABLE and self.size.value >= required_size.value

class LockerLocation:
    def __init__(self, location_id: str, address: str):
        self.location_id = location_id
        self.address = address
        self.lockers: list = []

    def add_locker(self, locker: Locker):
        self.lockers.append(locker)

    def find_available(self, required_size: LockerSize) -> Optional[Locker]:
        suitable = [l for l in self.lockers if l.can_fit(required_size)]
        # Smallest-fit: prefer the smallest locker that fits
        suitable.sort(key=lambda l: l.size.value)
        return suitable[0] if suitable else None

    def get_availability(self) -> dict:
        avail = {s: 0 for s in LockerSize}
        for locker in self.lockers:
            if locker.status == LockerStatus.AVAILABLE:
                avail[locker.size] += 1
        return avail

class LockerSystem:
    def __init__(self, pickup_window_hours: int = 72):
        self.locations: dict = {}
        self.packages: dict = {}
        self.pickup_window = timedelta(hours=pickup_window_hours)

    def add_location(self, location: LockerLocation):
        self.locations[location.location_id] = location

    def _generate_code(self, length: int = 6) -> str:
        return ''.join(random.choices(string digits, k=length))

    def assign_package(self, package: Package,
                       location_id: str) -> Optional[dict]:
        location = self.locations.get(location_id)
        if not location:
            return None

        required_size = package.required_size()
        locker = location.find_available(required_size)
        if not locker:
            return None

        code = self._generate_code()
        now = datetime.now()

        locker.status = LockerStatus.OCCUPIED
        locker.package_id = package.tracking_id
        locker.pickup_code = code
        locker.assigned_at = now
        locker.expires_at = now + self.pickup_window

        self.packages[package.tracking_id] = {
            "package": package,
            "locker_id": locker.locker_id,
            "location_id": location_id,
            "pickup_code": code,
            "expires_at": locker.expires_at
        }

        return {
            "locker_id": locker.locker_id,
            "pickup_code": code,
            "expires_at": locker.expires_at,
            "location": location.address
        }

    def pickup_package(self, tracking_id: str, code: str) -> dict:
        info = self.packages.get(tracking_id)
        if not info:
            return {"success": False, "error": "Package not found"}

        if info["pickup_code"] != code:
            return {"success": False, "error": "Invalid code"}

        location = self.locations[info["location_id"]]
        locker = next(l for l in location.lockers
                      if l.locker_id == info["locker_id"])

        if locker.expires_at and datetime.now() > locker.expires_at:
            return {"success": False, "error": "Pickup window expired"}

        # Release locker
        locker.status = LockerStatus.AVAILABLE
        locker.package_id = None
        locker.pickup_code = None
        locker.assigned_at = None
        locker.expires_at = None
        del self.packages[tracking_id]

        return {"success": True, "locker_id": locker.locker_id}

    def check_overdue(self) -> list:
        overdue = []
        now = datetime.now()
        for tracking_id, info in self.packages.items():
            if info["expires_at"] and now > info["expires_at"]:
                overdue.append(tracking_id)
        return overdue`,

    keyQuestions: [
      {
        question: 'How do you optimize locker allocation?',
        answer: `The key optimization is smallest-fit allocation: assign the smallest locker that can hold the package. This maximizes locker utilization by preserving larger lockers for packages that need them. Without this, assigning a small package to a large locker wastes capacity.

For multi-location scenarios, consider load balancing: if the customer's preferred location is full, suggest nearby locations with availability. Pre-reserve lockers for incoming packages to avoid race conditions between delivery and allocation. Track usage patterns to determine optimal locker size distribution at each location (a business district might need more small lockers for documents, while a residential area needs more large lockers).`
      },
      {
        question: 'How do you handle overdue packages?',
        answer: `Run a periodic job that checks for packages past their pickup window. First, send reminders before expiry (24 hours, 6 hours). After expiry, notify the customer that the package will be returned. Mark the locker as "overdue" and schedule a courier to collect undelivered packages.

For return-to-sender packages, log the event for customer service follow-up. Release the locker once the package is physically removed. Some systems offer a grace period (an extra 24 hours) before returning the package. Track overdue rates per location to identify locations where pickup windows should be extended.`
      }
    ],

    tips: [
      'Use smallest-fit allocation to maximize locker utilization',
      'Generate unique, time-limited pickup codes for security',
      'Run scheduled checks for overdue packages and send reminder notifications',
      'Support both package delivery and package returns using the same locker infrastructure',
      'Track availability by size per location for capacity planning'
    ]
  },
  {
    id: 'shopping-cart',
    title: 'Shopping Cart',
    subtitle: 'E-Commerce Cart System',
    icon: 'shoppingCart',
    color: '#f59e0b',
    difficulty: 'Medium',
    description: 'Design an e-commerce shopping cart with item management, pricing rules, promotions, and checkout.',

    introduction: `A shopping cart manages a customer's intended purchases through browsing, selection, and checkout. It handles item addition and removal, quantity updates, price calculation with discounts and taxes, coupon application, and cart persistence across sessions. The design must support complex pricing rules (buy-one-get-one, percentage off, tiered discounts) without hard-coding each promotion.

The key design challenge is the pricing engine: composing multiple discount rules (product discounts, category discounts, cart-wide coupons, loyalty points) into a final price that is correct and auditable.`,

    coreEntities: [
      { name: 'Cart', description: 'The shopping cart containing items, applied promotions, and computed totals' },
      { name: 'CartItem', description: 'An item in the cart with product reference, quantity, and line price' },
      { name: 'Product', description: 'A purchasable item with SKU, name, base price, and category' },
      { name: 'PricingEngine', description: 'Computes cart total by applying pricing rules in priority order' },
      { name: 'DiscountRule', description: 'Abstract discount rule: percentage off, flat discount, BOGO, tiered pricing' },
      { name: 'Coupon', description: 'A redeemable code with associated discount rule and usage constraints' },
      { name: 'TaxCalculator', description: 'Computes applicable taxes based on jurisdiction and product category' },
      { name: 'CheckoutService', description: 'Processes the cart into an order with payment and shipping' }
    ],

    designPatterns: [
      'Strategy Pattern: Different discount calculation strategies (percentage, flat, BOGO, tiered)',
      'Composite Pattern: Combine multiple discounts into a single pricing pipeline',
      'Observer Pattern: Notify UI of cart changes (item added, removed, price updated)',
      'Command Pattern: Cart operations (add, remove, update quantity) as undoable commands',
      'Template Method: Checkout flow with customizable steps (validate, calculate, reserve, charge)'
    ],

    implementation: `from dataclasses import dataclass, field
from abc import ABC, abstractmethod
from typing import Optional

@dataclass
class Product:
    product_id: str
    name: str
    price: float
    category: str
    weight: float = 0.0

@dataclass
class CartItem:
    product: Product
    quantity: int

    @property
    def line_total(self) -> float:
        return self.product.price * self.quantity

class DiscountRule(ABC):
    @abstractmethod
    def apply(self, cart: 'Cart') -> float:
        """Returns the discount amount to subtract"""
        pass

    @abstractmethod
    def description(self) -> str:
        pass

class PercentageDiscount(DiscountRule):
    def __init__(self, percentage: float, min_cart_total: float = 0):
        self.percentage = percentage
        self.min_total = min_cart_total

    def apply(self, cart: 'Cart') -> float:
        subtotal = cart.subtotal
        if subtotal >= self.min_total:
            return round(subtotal * self.percentage / 100, 2)
        return 0

    def description(self) -> str:
        return f"{self.percentage}% off"

class BuyNGetMFree(DiscountRule):
    def __init__(self, product_id: str, buy_n: int, free_m: int):
        self.product_id = product_id
        self.buy_n = buy_n
        self.free_m = free_m

    def apply(self, cart: 'Cart') -> float:
        item = cart.items.get(self.product_id)
        if not item or item.quantity < self.buy_n + self.free_m:
            return 0
        free_count = item.quantity // (self.buy_n + self.free_m) * self.free_m
        return round(free_count * item.product.price, 2)

    def description(self) -> str:
        return f"Buy {self.buy_n} get {self.free_m} free"

@dataclass
class Coupon:
    code: str
    discount_rule: DiscountRule
    max_uses: int = 1
    uses: int = 0
    min_cart_total: float = 0

    def is_valid(self, cart_total: float) -> bool:
        return self.uses < self.max_uses and cart_total >= self.min_cart_total

class Cart:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.items: dict = {}  # product_id -> CartItem
        self.applied_coupons: list = []
        self.discount_rules: list = []
        self._observers: list = []

    def add_observer(self, observer):
        self._observers.append(observer)

    def _notify(self, event: str):
        for obs in self._observers:
            obs.on_cart_change(event, self)

    def add_item(self, product: Product, quantity: int = 1):
        if product.product_id in self.items:
            self.items[product.product_id].quantity += quantity
        else:
            self.items[product.product_id] = CartItem(product, quantity)
        self._notify("item_added")

    def remove_item(self, product_id: str):
        self.items.pop(product_id, None)
        self._notify("item_removed")

    def update_quantity(self, product_id: str, quantity: int):
        if quantity <= 0:
            self.remove_item(product_id)
        elif product_id in self.items:
            self.items[product_id].quantity = quantity
            self._notify("quantity_updated")

    @property
    def subtotal(self) -> float:
        return sum(item.line_total for item in self.items.values())

    def apply_coupon(self, coupon: Coupon) -> bool:
        if coupon.is_valid(self.subtotal):
            self.applied_coupons.append(coupon)
            coupon.uses += 1
            self._notify("coupon_applied")
            return True
        return False

    def get_total_discount(self) -> float:
        total_discount = 0
        for rule in self.discount_rules:
            total_discount += rule.apply(self)
        for coupon in self.applied_coupons:
            total_discount += coupon.discount_rule.apply(self)
        return min(total_discount, self.subtotal)  # Never go negative

    @property
    def total(self) -> float:
        return round(self.subtotal - self.get_total_discount(), 2)

    def get_summary(self) -> dict:
        return {
            "items": [
                {"name": item.product.name, "qty": item.quantity,
                 "price": item.product.price, "line_total": item.line_total}
                for item in self.items.values()
            ],
            "subtotal": self.subtotal,
            "discount": self.get_total_discount(),
            "total": self.total,
            "item_count": sum(i.quantity for i in self.items.values())
        }`,

    keyQuestions: [
      {
        question: 'How do you handle complex discount stacking rules?',
        answer: `Define clear discount priority and stacking rules. Some discounts are exclusive (only the best one applies), and others are cumulative (all apply). Implement a PricingEngine that applies rules in priority order and respects stacking constraints.

Common approaches: apply product-level discounts first (BOGO), then category-level discounts (20% off electronics), then cart-level discounts (coupons), and finally loyalty points. At each level, check if the discount is exclusive (replaces others at the same level) or cumulative. The total discount should never exceed the subtotal. Document the stacking rules clearly so customers and customer service understand why they got a specific price.`
      },
      {
        question: 'How do you persist cart state across sessions?',
        answer: `For logged-in users, store the cart in the database. Each cart item records the product ID, quantity, and the price at time of addition (to detect price changes). When the user returns, load the cart and re-validate: check that products are still available, prices have not changed, and promotions are still active.

For anonymous users, store the cart in a session (cookie or local storage). When the user logs in, merge the anonymous cart with their saved cart (combining quantities for duplicates). Handle conflicts gracefully: if an item in the saved cart is now out of stock, notify the user rather than silently removing it.`
      }
    ],

    tips: [
      'Model discount rules as strategy objects so new promotions can be added without code changes',
      'Enforce a total discount cap: discounts should never exceed the subtotal',
      'Re-validate cart contents at checkout time (prices may have changed since items were added)',
      'Support cart persistence for logged-in users and session-based carts for guests',
      'Use the Observer pattern to keep the UI in sync with cart changes'
    ]
  },
  {
    id: 'car-rental',
    title: 'Car Rental System',
    subtitle: 'Vehicle Rental Management Platform',
    icon: 'car',
    color: '#ef4444',
    difficulty: 'Hard',
    description: 'Design a car rental system managing vehicles, reservations, pickup/return, billing, and fleet maintenance.',

    introduction: `A car rental system manages a fleet of vehicles across multiple locations, handles reservations, processes pickup and return, calculates billing, and tracks vehicle maintenance. The system supports different vehicle categories (economy, sedan, SUV, luxury), location-based availability, and insurance/add-on management.

The core challenge is managing vehicle availability across locations with overlapping reservations, handling one-way rentals (pick up at location A, return at location B), and implementing flexible pricing with daily rates, insurance options, and additional charges.`,

    coreEntities: [
      { name: 'Vehicle', description: 'A rental vehicle with make, model, category, mileage, and maintenance status' },
      { name: 'VehicleCategory', description: 'Category (Economy, Sedan, SUV, Luxury) with pricing tiers' },
      { name: 'Location', description: 'A rental branch with address, operating hours, and vehicle inventory' },
      { name: 'Reservation', description: 'A booking with customer, vehicle category, dates, locations, and add-ons' },
      { name: 'RentalAgreement', description: 'Active rental with assigned vehicle, pickup time, and terms' },
      { name: 'Customer', description: 'A customer with license info, payment method, and rental history' },
      { name: 'BillingService', description: 'Calculates rental cost including base rate, insurance, fuel, and penalties' },
      { name: 'MaintenanceTracker', description: 'Tracks vehicle maintenance schedules and service history' },
      { name: 'InsuranceOption', description: 'Available insurance packages (basic, premium, full coverage)' }
    ],

    designPatterns: [
      'Strategy Pattern: Pricing strategies (daily, weekly, monthly rates), insurance tiers',
      'State Pattern: Vehicle states (Available, Reserved, Rented, InMaintenance, Retired)',
      'Factory Method: Create rental agreements based on rental type (standard, one-way, long-term)',
      'Observer Pattern: Notify maintenance team when vehicle reaches service mileage',
      'Builder Pattern: Build rental agreements with optional add-ons (GPS, child seat, additional driver)'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional
from abc import ABC, abstractmethod
import uuid

class VehicleStatus(Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    RENTED = "rented"
    MAINTENANCE = "maintenance"
    RETIRED = "retired"

class VehicleCategory(Enum):
    ECONOMY = "economy"
    SEDAN = "sedan"
    SUV = "suv"
    LUXURY = "luxury"

@dataclass
class Vehicle:
    vehicle_id: str
    make: str
    model: str
    year: int
    category: VehicleCategory
    license_plate: str
    location_id: str
    status: VehicleStatus = VehicleStatus.AVAILABLE
    mileage: int = 0
    next_service_mileage: int = 10000

@dataclass
class Reservation:
    reservation_id: str
    customer_id: str
    category: VehicleCategory
    pickup_location: str
    return_location: str
    pickup_date: datetime
    return_date: datetime
    add_ons: list = field(default_factory=list)
    assigned_vehicle_id: Optional[str] = None
    status: str = "confirmed"

class PricingStrategy(ABC):
    @abstractmethod
    def calculate(self, category: VehicleCategory,
                  days: int, add_ons: list) -> float:
        pass

class StandardPricing(PricingStrategy):
    DAILY_RATES = {
        VehicleCategory.ECONOMY: 30,
        VehicleCategory.SEDAN: 50,
        VehicleCategory.SUV: 70,
        VehicleCategory.LUXURY: 120
    }

    def calculate(self, category, days, add_ons) -> float:
        base = self.DAILY_RATES[category] * days
        if days >= 7:
            base *= 0.9  # 10% weekly discount
        if days >= 30:
            base *= 0.85  # Additional long-term discount
        add_on_total = sum(a.get("daily_rate", 0) * days for a in add_ons)
        return round(base + add_on_total, 2)

class CarRentalSystem:
    def __init__(self):
        self.vehicles: dict = {}
        self.reservations: dict = {}
        self.locations: dict = {}
        self.pricing: PricingStrategy = StandardPricing()

    def add_vehicle(self, vehicle: Vehicle):
        self.vehicles[vehicle.vehicle_id] = vehicle

    def search_available(self, category: VehicleCategory,
                         location_id: str,
                         pickup_date: datetime,
                         return_date: datetime) -> list:
        available = []
        for v in self.vehicles.values():
            if (v.category == category and
                v.location_id == location_id and
                v.status == VehicleStatus.AVAILABLE):
                # Check no overlapping reservations
                if not self._has_conflict(v.vehicle_id, pickup_date, return_date):
                    available.append(v)
        return available

    def _has_conflict(self, vehicle_id: str,
                      start: datetime, end: datetime) -> bool:
        for res in self.reservations.values():
            if (res.assigned_vehicle_id == vehicle_id and
                res.status == "confirmed" and
                res.pickup_date < end and res.return_date > start):
                return True
        return False

    def make_reservation(self, customer_id: str,
                         category: VehicleCategory,
                         pickup_location: str,
                         return_location: str,
                         pickup_date: datetime,
                         return_date: datetime,
                         add_ons: list = None) -> Optional[Reservation]:
        available = self.search_available(category, pickup_location,
                                          pickup_date, return_date)
        if not available:
            return None

        vehicle = available[0]
        reservation = Reservation(
            reservation_id=str(uuid.uuid4()),
            customer_id=customer_id,
            category=category,
            pickup_location=pickup_location,
            return_location=return_location,
            pickup_date=pickup_date,
            return_date=return_date,
            add_ons=add_ons or [],
            assigned_vehicle_id=vehicle.vehicle_id
        )
        vehicle.status = VehicleStatus.RESERVED
        self.reservations[reservation.reservation_id] = reservation

        days = (return_date - pickup_date).days or 1
        estimated_cost = self.pricing.calculate(category, days, add_ons or [])
        return reservation

    def pickup_vehicle(self, reservation_id: str) -> dict:
        res = self.reservations[reservation_id]
        vehicle = self.vehicles[res.assigned_vehicle_id]
        vehicle.status = VehicleStatus.RENTED
        res.status = "active"
        return {"vehicle": vehicle, "reservation": res}

    def return_vehicle(self, reservation_id: str,
                       return_mileage: int,
                       fuel_level: float) -> dict:
        res = self.reservations[reservation_id]
        vehicle = self.vehicles[res.assigned_vehicle_id]

        days = max((datetime.now() - res.pickup_date).days, 1)
        base_cost = self.pricing.calculate(res.category, days, res.add_ons)

        # Late return penalty
        late_days = max((datetime.now() - res.return_date).days, 0)
        late_fee = late_days * 50  # $50/day late fee

        # Fuel penalty
        fuel_fee = (1.0 - fuel_level) * 60 if fuel_level < 0.9 else 0

        total = base_cost + late_fee + fuel_fee

        vehicle.mileage = return_mileage
        vehicle.status = VehicleStatus.AVAILABLE
        vehicle.location_id = res.return_location
        res.status = "completed"

        return {
            "base_cost": base_cost,
            "late_fee": late_fee,
            "fuel_fee": round(fuel_fee, 2),
            "total": round(total, 2)
        }`,

    keyQuestions: [
      {
        question: 'How do you handle one-way rentals?',
        answer: `One-way rentals change the vehicle's location on return. The vehicle is picked up at location A and returned at location B. This affects inventory balance: location A loses a vehicle and location B gains one. The system must track vehicle location dynamically and may charge a one-way fee to cover the cost of rebalancing inventory.

The reservation system must check availability at the pickup location for the pickup date and must not assume the vehicle will be at its current location indefinitely. A fleet balancing service periodically identifies location imbalances and arranges vehicle transfers (either by offering discounted one-way rentals in the needed direction or by hiring drivers to reposition vehicles).`
      },
      {
        question: 'How do you manage overlapping reservations for the same vehicle?',
        answer: `Each reservation specifies a pickup date and return date. When creating a new reservation, check all existing confirmed reservations for the candidate vehicle and verify there is no overlap: existing.pickup_date < new.return_date AND existing.return_date > new.pickup_date. If any overlap exists, the vehicle is not available for that period.

For category-based reservations (customer reserves an "SUV" rather than a specific vehicle), the system checks all vehicles of that category at the requested location and finds one without conflicts. The specific vehicle assignment can be deferred until pickup day, allowing the system to optimize assignments based on actual fleet status. This flexibility reduces the chance of unavailability due to early returns or extensions.`
      }
    ],

    tips: [
      'Separate reservation (category + dates) from vehicle assignment (specific vehicle) for flexibility',
      'Calculate billing at return time using actual duration, not just the reservation duration',
      'Handle one-way rentals by updating vehicle location on return and tracking fleet balance',
      'Use the Builder pattern for rental agreements with many optional add-ons',
      'Track vehicle maintenance by mileage and schedule service before the next rental period'
    ]
  },
  {
    id: 'meeting-scheduler',
    title: 'Meeting Scheduler',
    subtitle: 'Calendar-Based Meeting Coordination',
    icon: 'calendar',
    color: '#8b5cf6',
    difficulty: 'Hard',
    description: 'Design a meeting scheduling system that finds available time slots across multiple participants and manages room resources.',

    introduction: `A meeting scheduler coordinates meetings between multiple participants by finding mutually available time slots, booking rooms with required resources (projector, whiteboard, video conferencing), and managing the meeting lifecycle (creation, modification, cancellation, reminders). The system must handle recurring meetings, time zone differences, and conflict resolution.

The core algorithmic challenge is finding free slots across multiple calendars efficiently. For N participants, each with a day divided into time slots, finding a common free slot requires intersecting N availability sets.`,

    coreEntities: [
      { name: 'Calendar', description: 'A user calendar containing scheduled events and availability preferences' },
      { name: 'Meeting', description: 'A scheduled event with participants, time, room, and recurrence pattern' },
      { name: 'TimeSlot', description: 'A time interval with start and end times' },
      { name: 'MeetingRoom', description: 'A bookable room with capacity, equipment, and location' },
      { name: 'Participant', description: 'An attendee with calendar, response status, and required/optional flag' },
      { name: 'AvailabilityFinder', description: 'Finds common free time slots across multiple calendars' },
      { name: 'RecurrencePattern', description: 'Defines meeting repetition (daily, weekly, monthly) with exceptions' },
      { name: 'ReminderService', description: 'Sends reminders before meetings via configured channels' },
      { name: 'ConflictResolver', description: 'Handles scheduling conflicts and suggests alternatives' }
    ],

    designPatterns: [
      'Strategy Pattern: Different availability-finding algorithms (interval intersection, bitmap)',
      'Observer Pattern: Notify participants of meeting changes and send reminders',
      'Builder Pattern: Build meetings with optional components (recurrence, room, agenda)',
      'Template Method: Meeting creation workflow with customizable conflict handling',
      'Iterator Pattern: Generate recurring meeting instances on demand'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional
import uuid

class ResponseStatus(Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    TENTATIVE = "tentative"

@dataclass
class TimeSlot:
    start: datetime
    end: datetime

    @property
    def duration_minutes(self) -> int:
        return int((self.end - self.start).total_seconds() / 60)

    def overlaps(self, other: 'TimeSlot') -> bool:
        return self.start < other.end and self.end > other.start

@dataclass
class MeetingRoom:
    room_id: str
    name: str
    capacity: int
    equipment: list = field(default_factory=list)  # projector, whiteboard, etc.
    location: str = ""

@dataclass
class Participant:
    user_id: str
    name: str
    email: str
    is_required: bool = True
    response: ResponseStatus = ResponseStatus.PENDING

@dataclass
class Meeting:
    meeting_id: str
    title: str
    organizer_id: str
    time_slot: TimeSlot
    participants: list = field(default_factory=list)
    room: Optional[MeetingRoom] = None
    description: str = ""
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None  # e.g., "WEEKLY;BYDAY=MO,WE,FR"

class Calendar:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.meetings: list = []
        self.working_hours: TimeSlot = TimeSlot(
            start=datetime.now().replace(hour=9, minute=0),
            end=datetime.now().replace(hour=17, minute=0)
        )

    def add_meeting(self, meeting: Meeting):
        self.meetings.append(meeting)

    def remove_meeting(self, meeting_id: str):
        self.meetings = [m for m in self.meetings if m.meeting_id != meeting_id]

    def get_meetings_on_date(self, date: datetime) -> list:
        return [
            m for m in self.meetings
            if m.time_slot.start.date() == date.date()
        ]

    def get_free_slots(self, date: datetime,
                       duration_minutes: int) -> list:
        day_start = date.replace(hour=9, minute=0, second=0)
        day_end = date.replace(hour=17, minute=0, second=0)
        busy = sorted(
            [m.time_slot for m in self.get_meetings_on_date(date)],
            key=lambda s: s.start
        )

        free = []
        current = day_start
        for slot in busy:
            if slot.start > current:
                gap = TimeSlot(current, slot.start)
                if gap.duration_minutes >= duration_minutes:
                    free.append(gap)
            current = max(current, slot.end)

        if current < day_end:
            gap = TimeSlot(current, day_end)
            if gap.duration_minutes >= duration_minutes:
                free.append(gap)
        return free

class AvailabilityFinder:
    def find_common_slots(self, calendars: list,
                          date: datetime,
                          duration_minutes: int) -> list:
        if not calendars:
            return []

        # Get free slots for each calendar
        all_free = [cal.get_free_slots(date, duration_minutes) for cal in calendars]

        # Intersect: start with first calendar's free slots
        common = all_free[0]
        for other_free in all_free[1:]:
            common = self._intersect(common, other_free, duration_minutes)
        return common

    def _intersect(self, slots_a: list, slots_b: list,
                   min_duration: int) -> list:
        result = []
        i, j = 0, 0
        while i < len(slots_a) and j < len(slots_b):
            start = max(slots_a[i].start, slots_b[j].start)
            end = min(slots_a[i].end, slots_b[j].end)
            if start < end:
                overlap = TimeSlot(start, end)
                if overlap.duration_minutes >= min_duration:
                    result.append(overlap)
            if slots_a[i].end < slots_b[j].end:
                i += 1
            else:
                j += 1
        return result

class MeetingScheduler:
    def __init__(self):
        self.calendars: dict = {}
        self.rooms: dict = {}
        self.meetings: dict = {}
        self.availability = AvailabilityFinder()

    def register_calendar(self, user_id: str) -> Calendar:
        cal = Calendar(user_id)
        self.calendars[user_id] = cal
        return cal

    def add_room(self, room: MeetingRoom):
        self.rooms[room.room_id] = room

    def find_available_slots(self, participant_ids: list,
                             date: datetime,
                             duration_minutes: int) -> list:
        calendars = [self.calendars[uid] for uid in participant_ids
                     if uid in self.calendars]
        return self.availability.find_common_slots(calendars, date, duration_minutes)

    def schedule_meeting(self, title: str, organizer_id: str,
                         participant_ids: list, time_slot: TimeSlot,
                         room_id: str = None) -> Meeting:
        participants = [
            Participant(user_id=uid, name=uid, email=f"{uid}@company.com")
            for uid in participant_ids
        ]
        room = self.rooms.get(room_id) if room_id else None

        meeting = Meeting(
            meeting_id=str(uuid.uuid4()),
            title=title,
            organizer_id=organizer_id,
            time_slot=time_slot,
            participants=participants,
            room=room
        )
        self.meetings[meeting.meeting_id] = meeting

        for uid in participant_ids:
            if uid in self.calendars:
                self.calendars[uid].add_meeting(meeting)

        return meeting

    def cancel_meeting(self, meeting_id: str):
        meeting = self.meetings.get(meeting_id)
        if meeting:
            for p in meeting.participants:
                if p.user_id in self.calendars:
                    self.calendars[p.user_id].remove_meeting(meeting_id)
            del self.meetings[meeting_id]`,

    keyQuestions: [
      {
        question: 'How do you efficiently find common free time across many calendars?',
        answer: `The algorithm works by computing free intervals for each calendar on a given date (by inverting the busy intervals within working hours), then intersecting all free interval lists pairwise. Two sorted interval lists can be intersected in O(n + m) time using a two-pointer approach.

For N participants, each with at most K meetings per day, finding free slots takes O(N * K log K) for sorting plus O(N * K) for the intersection passes. For practical calendar sizes (K < 20 meetings per day), this is very fast. At scale, you can pre-compute and cache each user's free/busy intervals daily, reducing the computation to just the intersection step when a scheduling request comes in.`
      },
      {
        question: 'How do you handle recurring meetings?',
        answer: `Store the recurrence rule (RFC 5545 RRULE format: "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231") rather than generating all instances upfront. When querying a date range, expand the recurrence rule to generate meeting instances dynamically.

Support exceptions: specific instances can be modified (different time or room for one occurrence) or cancelled (skip a holiday). Store exceptions as a list of dates with their modifications. When expanding the recurrence, apply exceptions to override or remove specific instances. This approach scales to long-running recurring meetings without storing thousands of individual meeting records.`
      }
    ],

    tips: [
      'Use interval intersection algorithms for efficient multi-calendar availability queries',
      'Store recurring meeting rules, not individual instances, and expand on demand',
      'Support meeting room booking as a separate availability check on room calendars',
      'Handle time zones by storing all times in UTC and converting for display',
      'Implement conflict detection that prevents double-booking participants and rooms'
    ]
  },
  {
    id: 'url-shortener-lld',
    title: 'URL Shortener',
    subtitle: 'Link Shortening and Redirection Service',
    icon: 'link',
    color: '#06b6d4',
    difficulty: 'Medium',
    description: 'Design a URL shortening service that creates short aliases for long URLs with analytics tracking.',

    introduction: `A URL shortener converts long URLs into short, shareable links and redirects users from the short link to the original URL. The system must generate unique short codes, handle high-volume redirects with minimal latency, track click analytics, and support optional features like custom aliases, expiration, and access control.

The core challenge is the encoding scheme: mapping a potentially infinite space of long URLs to a finite space of short codes while ensuring uniqueness, avoiding collisions, and keeping the codes short enough to be useful.`,

    coreEntities: [
      { name: 'ShortURL', description: 'A mapping from short code to original URL with metadata and analytics' },
      { name: 'URLEncoder', description: 'Generates unique short codes using base62 encoding or hashing' },
      { name: 'URLStore', description: 'Persists URL mappings with fast lookup by short code' },
      { name: 'AnalyticsTracker', description: 'Records click events with timestamp, referrer, device, and location' },
      { name: 'RedirectionService', description: 'Handles incoming requests and redirects to the original URL' },
      { name: 'ExpirationService', description: 'Manages URL expiration and cleanup of expired mappings' }
    ],

    designPatterns: [
      'Strategy Pattern: Different encoding strategies (base62, MD5 hash truncation, counter-based)',
      'Proxy Pattern: Redirection service acts as a proxy for the original URL',
      'Observer Pattern: Analytics tracking observes redirect events',
      'Factory Method: Create different URL types (permanent, temporary, custom alias)',
      'Singleton Pattern: Counter-based ID generator for sequential short code generation'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional
from collections import defaultdict
import string
import hashlib

BASE62_CHARS = string.ascii_letters + string.digits

class Base62Encoder:
    def encode(self, number: int) -> str:
        if number == 0:
            return BASE62_CHARS[0]
        result = []
        while number > 0:
            result.append(BASE62_CHARS[number % 62])
            number //= 62
        return ''.join(reversed(result))

    def decode(self, code: str) -> int:
        result = 0
        for char in code:
            result = result * 62 + BASE62_CHARS.index(char)
        return result

@dataclass
class ShortURL:
    short_code: str
    original_url: str
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    created_by: Optional[str] = None
    click_count: int = 0
    is_active: bool = True

@dataclass
class ClickEvent:
    short_code: str
    timestamp: datetime
    referrer: str = ""
    user_agent: str = ""
    ip_address: str = ""

class URLShortener:
    def __init__(self, domain: str = "short.url"):
        self.domain = domain
        self.url_store: dict = {}  # short_code -> ShortURL
        self.reverse_map: dict = {}  # original_url -> short_code
        self.analytics: dict = defaultdict(list)  # short_code -> [ClickEvent]
        self.encoder = Base62Encoder()
        self._counter = 100000  # Starting counter for sequential IDs

    def shorten(self, original_url: str, custom_alias: str = None,
                expires_in_days: int = None,
                user_id: str = None) -> ShortURL:
        # Check if URL already shortened
        if not custom_alias and original_url in self.reverse_map:
            existing_code = self.reverse_map[original_url]
            return self.url_store[existing_code]

        # Generate or validate short code
        if custom_alias:
            if custom_alias in self.url_store:
                raise ValueError(f"Alias '{custom_alias}' already taken")
            short_code = custom_alias
        else:
            short_code = self._generate_code()

        expires_at = None
        if expires_in_days:
            expires_at = datetime.now() + timedelta(days=expires_in_days)

        short_url = ShortURL(
            short_code=short_code,
            original_url=original_url,
            expires_at=expires_at,
            created_by=user_id
        )

        self.url_store[short_code] = short_url
        self.reverse_map[original_url] = short_code
        return short_url

    def _generate_code(self) -> str:
        self._counter += 1
        code = self.encoder.encode(self._counter)
        while code in self.url_store:
            self._counter += 1
            code = self.encoder.encode(self._counter)
        return code

    def resolve(self, short_code: str, referrer: str = "",
                user_agent: str = "", ip: str = "") -> Optional[str]:
        short_url = self.url_store.get(short_code)
        if not short_url or not short_url.is_active:
            return None

        if short_url.expires_at and datetime.now() > short_url.expires_at:
            short_url.is_active = False
            return None

        # Track analytics
        short_url.click_count += 1
        self.analytics[short_code].append(ClickEvent(
            short_code=short_code,
            timestamp=datetime.now(),
            referrer=referrer,
            user_agent=user_agent,
            ip_address=ip
        ))

        return short_url.original_url

    def get_analytics(self, short_code: str) -> dict:
        short_url = self.url_store.get(short_code)
        if not short_url:
            return {}
        clicks = self.analytics.get(short_code, [])
        return {
            "short_code": short_code,
            "original_url": short_url.original_url,
            "total_clicks": short_url.click_count,
            "created_at": short_url.created_at.isoformat(),
            "recent_clicks": len([c for c in clicks
                                  if (datetime.now() - c.timestamp).days < 7])
        }

    def get_full_url(self, short_code: str) -> str:
        return f"https://{self.domain}/{short_code}"`,

    keyQuestions: [
      {
        question: 'How do you generate unique short codes without collisions?',
        answer: `Two main approaches: counter-based and hash-based. Counter-based: maintain an auto-incrementing counter. Each new URL gets the next counter value, which is then encoded in base62. Counter 100000 encodes to "q0U", counter 100001 encodes to "q0V", etc. This guarantees uniqueness without collision checks but produces predictable codes.

Hash-based: hash the original URL (MD5, SHA256) and take the first 6-8 characters. This can produce collisions, so you must check the store and rehash (or use a different seed) on collision. Hash-based codes are less predictable but require collision handling. At scale, counter-based is preferred with a distributed counter (like Twitter Snowflake) to avoid contention. 6 base62 characters support 62^6 = 56 billion unique URLs.`
      },
      {
        question: 'How do you handle high-volume redirects efficiently?',
        answer: `Redirects must be fast (under 10ms) since every click goes through the shortener. Use a multi-layer caching strategy: in-memory cache (like a HashMap) for the hottest URLs, a distributed cache (Redis) for warm URLs, and the database as the cold store.

Popular URLs (those clicked thousands of times per day) are always in the memory cache. The cache lookup is O(1). For even higher performance, use a CDN: configure the short URL domain's DNS to point to a CDN, which caches the redirect response (301 or 302). Subsequent clicks from the same region are served directly by the CDN edge without hitting your application servers at all.`
      }
    ],

    tips: [
      'Use base62 encoding (a-z, A-Z, 0-9) for short, URL-safe codes',
      'Counter-based generation avoids collisions; hash-based requires collision handling',
      'Cache hot URLs in memory for sub-millisecond redirect latency',
      'Use 301 (permanent) redirects for SEO-friendly links, 302 (temporary) for trackable links',
      'Support custom aliases but validate them against existing codes and reserved words'
    ]
  },
  {
    id: 'rate-limiter-lld',
    title: 'Rate Limiter',
    subtitle: 'API Rate Limiting System',
    icon: 'shield',
    color: '#ef4444',
    difficulty: 'Medium',
    description: 'Design a rate limiter that controls request rates using different algorithms with per-user and global limits.',

    introduction: `A rate limiter controls the rate at which users or services can make requests to an API. It protects backend services from being overwhelmed by too many requests, whether from a misbehaving client, a DDoS attack, or a traffic spike. The rate limiter decides, for each incoming request, whether to allow it or reject it (typically with HTTP 429 Too Many Requests).

Multiple algorithms exist, each with different trade-offs: fixed window (simple but allows bursts at window boundaries), sliding window log (precise but memory-intensive), sliding window counter (good balance), token bucket (smooth rate with burst allowance), and leaky bucket (constant output rate).`,

    coreEntities: [
      { name: 'RateLimiter', description: 'Core component that decides whether to allow or reject a request' },
      { name: 'RateLimitRule', description: 'Configuration specifying limit, window, and scope (user, IP, global)' },
      { name: 'TokenBucket', description: 'Token bucket algorithm implementation with configurable rate and capacity' },
      { name: 'SlidingWindowCounter', description: 'Sliding window counter algorithm for smooth rate limiting' },
      { name: 'RateLimitStore', description: 'Backend storage for rate limit state (in-memory or Redis)' },
      { name: 'RateLimitMiddleware', description: 'HTTP middleware that intercepts requests and applies rate limiting' }
    ],

    designPatterns: [
      'Strategy Pattern: Different rate limiting algorithms (token bucket, sliding window, fixed window)',
      'Chain of Responsibility: Apply multiple rate limit rules in sequence (per-user, per-IP, global)',
      'Decorator Pattern: Add rate limiting as a decorator around existing services',
      'Factory Method: Create appropriate rate limiter based on configuration',
      'Observer Pattern: Alert on rate limit threshold breaches'
    ],

    implementation: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from collections import defaultdict
from threading import Lock
import time

@dataclass
class RateLimitResult:
    allowed: bool
    remaining: int
    reset_at: float  # Unix timestamp
    retry_after: float = 0  # Seconds to wait

class RateLimitAlgorithm(ABC):
    @abstractmethod
    def is_allowed(self, key: str) -> RateLimitResult:
        pass

class TokenBucket(RateLimitAlgorithm):
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate  # tokens per second
        self._buckets: dict = {}
        self._lock = Lock()

    def is_allowed(self, key: str) -> RateLimitResult:
        with self._lock:
            now = time.time()
            if key not in self._buckets:
                self._buckets[key] = {
                    "tokens": self.capacity,
                    "last_refill": now
                }

            bucket = self._buckets[key]
            # Refill tokens based on elapsed time
            elapsed = now - bucket["last_refill"]
            bucket["tokens"] = min(
                self.capacity,
                bucket["tokens"] + elapsed * self.refill_rate
            )
            bucket["last_refill"] = now

            if bucket["tokens"] >= 1:
                bucket["tokens"] -= 1
                return RateLimitResult(
                    allowed=True,
                    remaining=int(bucket["tokens"]),
                    reset_at=now + (self.capacity - bucket["tokens"]) / self.refill_rate
                )
            else:
                wait_time = (1 - bucket["tokens"]) / self.refill_rate
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_at=now + wait_time,
                    retry_after=wait_time
                )

class SlidingWindowCounter(RateLimitAlgorithm):
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._windows: dict = defaultdict(lambda: {"current": 0, "previous": 0, "current_start": 0})
        self._lock = Lock()

    def is_allowed(self, key: str) -> RateLimitResult:
        with self._lock:
            now = time.time()
            window_start = int(now / self.window_seconds) * self.window_seconds
            window = self._windows[key]

            # Rotate windows if needed
            if window_start != window["current_start"]:
                if window_start - window["current_start"] >= self.window_seconds:
                    window["previous"] = window["current"]
                else:
                    window["previous"] = 0
                window["current"] = 0
                window["current_start"] = window_start

            # Calculate weighted count
            elapsed_ratio = (now - window_start) / self.window_seconds
            weighted_count = (
                window["previous"] * (1 - elapsed_ratio) +
                window["current"]
            )

            if weighted_count < self.max_requests:
                window["current"] += 1
                remaining = int(self.max_requests - weighted_count - 1)
                return RateLimitResult(
                    allowed=True,
                    remaining=max(remaining, 0),
                    reset_at=window_start + self.window_seconds
                )
            else:
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_at=window_start + self.window_seconds,
                    retry_after=window_start + self.window_seconds - now
                )

class FixedWindowCounter(RateLimitAlgorithm):
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._counters: dict = {}
        self._lock = Lock()

    def is_allowed(self, key: str) -> RateLimitResult:
        with self._lock:
            now = time.time()
            window_key = int(now / self.window_seconds)

            if key not in self._counters or self._counters[key]["window"] != window_key:
                self._counters[key] = {"window": window_key, "count": 0}

            counter = self._counters[key]
            window_end = (window_key + 1) * self.window_seconds

            if counter["count"] < self.max_requests:
                counter["count"] += 1
                return RateLimitResult(
                    allowed=True,
                    remaining=self.max_requests - counter["count"],
                    reset_at=window_end
                )
            return RateLimitResult(
                allowed=False, remaining=0,
                reset_at=window_end,
                retry_after=window_end - now
            )

class RateLimiter:
    def __init__(self):
        self.rules: list = []  # (scope_fn, algorithm) pairs

    def add_rule(self, scope_fn, algorithm: RateLimitAlgorithm):
        """scope_fn extracts the rate limit key from a request"""
        self.rules.append((scope_fn, algorithm))

    def check(self, request: dict) -> RateLimitResult:
        for scope_fn, algorithm in self.rules:
            key = scope_fn(request)
            result = algorithm.is_allowed(key)
            if not result.allowed:
                return result
        return RateLimitResult(allowed=True, remaining=-1, reset_at=0)

# Usage
limiter = RateLimiter()
limiter.add_rule(
    lambda req: f"user:{req.get('user_id')}",
    TokenBucket(capacity=100, refill_rate=10)  # 100 burst, 10/sec sustained
)
limiter.add_rule(
    lambda req: f"ip:{req.get('ip')}",
    SlidingWindowCounter(max_requests=1000, window_seconds=3600)  # 1000/hour per IP
)`,

    keyQuestions: [
      {
        question: 'What are the trade-offs between different rate limiting algorithms?',
        answer: `Fixed Window: simplest implementation, but allows double the limit at window boundaries (a burst at the end of one window and start of the next). Use when simplicity matters more than precision.

Sliding Window Log: stores the timestamp of every request and counts those within the window. Most accurate but uses O(n) memory per user where n is the number of requests. Use when precision is critical and request volumes are low.

Sliding Window Counter: approximates the sliding window using the weighted sum of the current and previous fixed window counts. Memory-efficient O(1) per user, good accuracy. Best general-purpose choice.

Token Bucket: allows bursts up to the bucket capacity while maintaining a long-term average rate. Tokens refill at a constant rate. Good for APIs that should tolerate occasional bursts but limit sustained throughput. Used by AWS API Gateway.

Leaky Bucket: processes requests at a constant rate regardless of arrival pattern. Smooths out bursts completely. Good for systems that need a steady output rate.`
      },
      {
        question: 'How do you implement distributed rate limiting?',
        answer: `In a multi-server environment, rate limit state must be shared. Use Redis as a centralized store: INCR and EXPIRE commands for fixed window, sorted sets with ZADD and ZRANGEBYSCORE for sliding window log, and a Lua script for atomic token bucket operations.

For high throughput, use local rate limiters with periodic sync to Redis. Each server maintains a local counter and syncs to Redis every second. The local limit is the global limit divided by the number of servers (with some headroom). This trades precision for performance: the actual limit may be slightly over the configured limit during sync windows, but the overhead of Redis calls per request is eliminated.`
      }
    ],

    tips: [
      'Choose your algorithm based on the precision vs complexity trade-off for your use case',
      'Token bucket is the best general-purpose algorithm: allows bursts with a sustained rate limit',
      'Return rate limit headers (X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After) in responses',
      'Apply rate limits at multiple scopes: per-user, per-IP, and global',
      'Use Redis for distributed rate limiting across multiple application servers'
    ]
  },
  {
    id: 'in-memory-filesystem',
    title: 'In-Memory File System',
    subtitle: 'Hierarchical Virtual File System',
    icon: 'folder',
    color: '#8b5cf6',
    difficulty: 'Hard',
    description: 'Design an in-memory file system supporting directories, files, and standard operations like ls, mkdir, cat, and write.',

    introduction: `An in-memory file system implements a hierarchical directory structure entirely in memory. It supports standard file system operations: creating directories (mkdir), listing directory contents (ls), creating and writing files, reading file contents (cat), and navigating the directory tree. The system uses a tree data structure where directories are internal nodes and files are leaf nodes.

This is a popular interview problem that tests your understanding of tree data structures, string parsing for path handling, and recursive operations. The design must handle absolute paths (/home/user/docs), relative navigation, and edge cases like operations on non-existent paths.`,

    coreEntities: [
      { name: 'FileSystemNode', description: 'Abstract base for both files and directories' },
      { name: 'File', description: 'A leaf node containing text content' },
      { name: 'Directory', description: 'An internal node containing children (files and subdirectories)' },
      { name: 'FileSystem', description: 'The main class providing ls, mkdir, addContentToFile, and readContentFromFile' },
      { name: 'PathResolver', description: 'Parses and resolves paths to nodes in the tree' }
    ],

    designPatterns: [
      'Composite Pattern: Directory (composite) and File (leaf) share a common FileSystemNode interface',
      'Factory Method: Create File or Directory nodes based on the operation',
      'Iterator Pattern: Traverse directory contents and subdirectories',
      'Command Pattern: File operations as commands for undo support'
    ],

    implementation: `from collections import defaultdict

class FileSystemNode:
    def __init__(self, name: str):
        self.name = name

class File(FileSystemNode):
    def __init__(self, name: str):
        super().__init__(name)
        self.content = ""

    def append(self, content: str):
        self.content += content

    def read(self) -> str:
        return self.content

class Directory(FileSystemNode):
    def __init__(self, name: str):
        super().__init__(name)
        self.children: dict = {}  # name -> FileSystemNode

    def add_child(self, node: FileSystemNode):
        self.children[node.name] = node

    def get_child(self, name: str):
        return self.children.get(name)

    def list_contents(self) -> list:
        return sorted(self.children.keys())

class FileSystem:
    def __init__(self):
        self.root = Directory("")

    def _resolve_path(self, path: str) -> list:
        """Split path into components, handling /"""
        if path == "/":
            return []
        return path.strip("/").split("/")

    def _navigate_to(self, parts: list, create_dirs: bool = False):
        """Navigate to the node at the given path parts"""
        node = self.root
        for part in parts:
            child = node.get_child(part)
            if child is None:
                if create_dirs:
                    child = Directory(part)
                    node.add_child(child)
                else:
                    return None
            node = child
        return node

    def ls(self, path: str) -> list:
        parts = self._resolve_path(path)
        node = self._navigate_to(parts)
        if node is None:
            return []
        if isinstance(node, File):
            return [node.name]
        return node.list_contents()

    def mkdir(self, path: str):
        parts = self._resolve_path(path)
        self._navigate_to(parts, create_dirs=True)

    def add_content_to_file(self, path: str, content: str):
        parts = self._resolve_path(path)
        parent_parts = parts[:-1]
        file_name = parts[-1]

        # Ensure parent directories exist
        parent = self._navigate_to(parent_parts, create_dirs=True)
        child = parent.get_child(file_name)
        if child is None:
            child = File(file_name)
            parent.add_child(child)
        if isinstance(child, File):
            child.append(content)

    def read_content_from_file(self, path: str) -> str:
        parts = self._resolve_path(path)
        node = self._navigate_to(parts)
        if isinstance(node, File):
            return node.read()
        return ""

    def rm(self, path: str) -> bool:
        parts = self._resolve_path(path)
        if not parts:
            return False  # Cannot remove root
        parent = self._navigate_to(parts[:-1])
        if parent and isinstance(parent, Directory):
            name = parts[-1]
            if name in parent.children:
                del parent.children[name]
                return True
        return False

    def find(self, path: str, name: str) -> list:
        """Find all files/dirs matching name under path"""
        parts = self._resolve_path(path)
        start_node = self._navigate_to(parts)
        results = []
        self._find_recursive(start_node, name, path, results)
        return results

    def _find_recursive(self, node, target_name, current_path, results):
        if node is None:
            return
        if node.name == target_name:
            results.append(current_path)
        if isinstance(node, Directory):
            for child_name, child in node.children.items():
                child_path = f"{current_path}/{child_name}".replace("//", "/")
                self._find_recursive(child, target_name, child_path, results)`,

    keyQuestions: [
      {
        question: 'Why is the Composite pattern ideal for a file system?',
        answer: `A file system is a natural tree structure where directories (composites) contain other directories and files (leaves). The Composite pattern lets you treat both uniformly through a common FileSystemNode interface. Operations like getSize(), delete(), and getPermissions() can be called on any node: a file returns its own size, while a directory recursively sums its children's sizes.

This uniformity simplifies path resolution: you traverse the tree without caring whether intermediate nodes are files or directories until you reach the target. The alternative (separate handling for files and directories at every step) would require type-checking throughout the codebase.`
      },
      {
        question: 'How do you handle path resolution efficiently?',
        answer: `Path resolution splits the path string into components and traverses the tree one level at a time. For "/home/user/docs/file.txt", split into ["home", "user", "docs", "file.txt"] and navigate from root through each directory.

For efficiency, cache recently accessed paths (LRU cache mapping path string to node). This avoids repeated traversal for frequently accessed directories. Handle edge cases: double slashes ("//"), trailing slashes ("/dir/"), relative paths with "." and ".." (resolve ".." by maintaining a stack of directories during traversal). Validate at each step that the current node is a directory (not a file) before continuing traversal.`
      }
    ],

    tips: [
      'Use the Composite pattern: Directory is the composite, File is the leaf',
      'Store children in a sorted dictionary/TreeMap for efficient ls() output',
      'Handle edge cases: root path ("/"), trailing slashes, empty path components',
      'Support both create-on-navigate (for mkdir) and strict navigation (for ls)',
      'Consider adding metadata (size, timestamps, permissions) to FileSystemNode for realism'
    ]
  },
  {
    id: 'version-control',
    title: 'Version Control System',
    subtitle: 'Git-Like Version Control',
    icon: 'gitBranch',
    color: '#f97316',
    difficulty: 'Hard',
    description: 'Design a simplified version control system supporting commits, branches, merging, and diff operations.',

    introduction: `A version control system (VCS) tracks changes to files over time, enabling developers to collaborate, review history, and revert to previous states. This design covers the core concepts of a Git-like system: commits (snapshots of the project state), branches (divergent development lines), merging (combining branches), and diffs (comparing file versions).

The system uses a directed acyclic graph (DAG) of commits, where each commit points to its parent(s). Branches are simply pointers to specific commits. The current working state is tracked by HEAD, which points to the active branch. Files are stored as snapshots in each commit (simplified from Git's blob/tree/commit object model).`,

    coreEntities: [
      { name: 'Repository', description: 'The top-level container managing the commit graph, branches, and working directory' },
      { name: 'Commit', description: 'A snapshot of all files at a point in time with message, author, and parent reference' },
      { name: 'Branch', description: 'A named pointer to a specific commit' },
      { name: 'StagingArea', description: 'Holds changes staged for the next commit (the index)' },
      { name: 'FileSnapshot', description: 'The content of a file at a specific commit' },
      { name: 'DiffEngine', description: 'Computes differences between two file versions' },
      { name: 'MergeEngine', description: 'Merges two branches, detecting and reporting conflicts' }
    ],

    designPatterns: [
      'Memento Pattern: Commits are mementos capturing repository state at a point in time',
      'Command Pattern: VCS operations (commit, branch, merge, revert) as reversible commands',
      'Composite Pattern: Directory tree structure within each commit snapshot',
      'Iterator Pattern: Traverse commit history (log) following parent pointers',
      'Strategy Pattern: Different merge strategies (fast-forward, three-way, rebase)'
    ],

    implementation: `from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import hashlib
import copy

@dataclass
class Commit:
    commit_id: str
    message: str
    author: str
    timestamp: datetime
    parent_id: Optional[str]
    snapshot: dict  # filename -> content

@dataclass
class Branch:
    name: str
    commit_id: str

class Repository:
    def __init__(self, name: str):
        self.name = name
        self.commits: dict = {}  # commit_id -> Commit
        self.branches: dict = {}  # branch_name -> Branch
        self.head: str = "main"  # current branch name
        self.working_dir: dict = {}  # filename -> content
        self.staging_area: dict = {}  # filename -> content (staged changes)

        # Create initial empty commit
        initial = self._create_commit("Initial commit", "system", None, {})
        self.branches["main"] = Branch("main", initial.commit_id)

    def _generate_id(self, content: str) -> str:
        return hashlib.sha1(
            f"{content}{datetime.now().isoformat()}".encode()
        ).hexdigest()[:8]

    def _create_commit(self, message, author, parent_id, snapshot) -> Commit:
        commit_id = self._generate_id(message)
        commit = Commit(
            commit_id=commit_id,
            message=message,
            author=author,
            timestamp=datetime.now(),
            parent_id=parent_id,
            snapshot=copy.deepcopy(snapshot)
        )
        self.commits[commit_id] = commit
        return commit

    def _current_branch(self) -> Branch:
        return self.branches[self.head]

    def _current_commit(self) -> Commit:
        return self.commits[self._current_branch().commit_id]

    # Working directory operations
    def add_file(self, filename: str, content: str):
        self.working_dir[filename] = content

    def edit_file(self, filename: str, content: str):
        if filename not in self.working_dir:
            raise FileNotFoundError(f"File not found: {filename}")
        self.working_dir[filename] = content

    # Staging
    def stage(self, filename: str):
        if filename not in self.working_dir:
            raise FileNotFoundError(f"File not found: {filename}")
        self.staging_area[filename] = self.working_dir[filename]

    def stage_all(self):
        self.staging_area = copy.deepcopy(self.working_dir)

    # Commit
    def commit(self, message: str, author: str) -> Commit:
        if not self.staging_area:
            raise ValueError("Nothing to commit")

        current = self._current_commit()
        new_snapshot = copy.deepcopy(current.snapshot)
        new_snapshot.update(self.staging_area)

        new_commit = self._create_commit(
            message, author, current.commit_id, new_snapshot
        )
        self._current_branch().commit_id = new_commit.commit_id
        self.staging_area.clear()
        return new_commit

    # Branching
    def create_branch(self, name: str):
        if name in self.branches:
            raise ValueError(f"Branch '{name}' already exists")
        current_commit = self._current_branch().commit_id
        self.branches[name] = Branch(name, current_commit)

    def checkout(self, branch_name: str):
        if branch_name not in self.branches:
            raise ValueError(f"Branch '{branch_name}' not found")
        self.head = branch_name
        commit = self._current_commit()
        self.working_dir = copy.deepcopy(commit.snapshot)
        self.staging_area.clear()

    # Log
    def log(self, max_entries: int = 10) -> list:
        entries = []
        commit_id = self._current_branch().commit_id
        while commit_id and len(entries) < max_entries:
            commit = self.commits[commit_id]
            entries.append(commit)
            commit_id = commit.parent_id
        return entries

    # Diff
    def diff(self, commit_id_a: str, commit_id_b: str) -> dict:
        snap_a = self.commits[commit_id_a].snapshot
        snap_b = self.commits[commit_id_b].snapshot
        all_files = set(snap_a.keys()) | set(snap_b.keys())

        changes = {}
        for f in all_files:
            content_a = snap_a.get(f)
            content_b = snap_b.get(f)
            if content_a != content_b:
                if content_a is None:
                    changes[f] = {"type": "added", "content": content_b}
                elif content_b is None:
                    changes[f] = {"type": "deleted", "content": content_a}
                else:
                    changes[f] = {"type": "modified", "old": content_a, "new": content_b}
        return changes

    # Merge (simple fast-forward or snapshot merge)
    def merge(self, source_branch: str) -> dict:
        if source_branch not in self.branches:
            raise ValueError(f"Branch '{source_branch}' not found")

        source_commit = self.commits[self.branches[source_branch].commit_id]
        target_commit = self._current_commit()

        # Check for conflicts
        source_snap = source_commit.snapshot
        target_snap = target_commit.snapshot
        conflicts = {}
        merged = copy.deepcopy(target_snap)

        for filename, content in source_snap.items():
            if filename in target_snap:
                if target_snap[filename] != content:
                    # Both modified the same file differently
                    parent = self._find_common_ancestor(
                        self.branches[source_branch].commit_id,
                        self._current_branch().commit_id
                    )
                    parent_content = self.commits[parent].snapshot.get(filename) if parent else None
                    if parent_content != target_snap[filename] and parent_content != content:
                        conflicts[filename] = {
                            "ours": target_snap[filename],
                            "theirs": content
                        }
                    else:
                        merged[filename] = content
            else:
                merged[filename] = content

        if conflicts:
            return {"status": "conflict", "conflicts": conflicts}

        merge_commit = self._create_commit(
            f"Merge branch '{source_branch}' into {self.head}",
            "system", target_commit.commit_id, merged
        )
        self._current_branch().commit_id = merge_commit.commit_id
        self.working_dir = copy.deepcopy(merged)
        return {"status": "success", "commit_id": merge_commit.commit_id}

    def _find_common_ancestor(self, id_a: str, id_b: str) -> Optional[str]:
        ancestors_a = set()
        current = id_a
        while current:
            ancestors_a.add(current)
            current = self.commits[current].parent_id
        current = id_b
        while current:
            if current in ancestors_a:
                return current
            current = self.commits[current].parent_id
        return None`,

    keyQuestions: [
      {
        question: 'How does the commit graph work as a data structure?',
        answer: `The commit history forms a Directed Acyclic Graph (DAG). Each commit node contains a snapshot of the project state, metadata (message, author, timestamp), and a pointer to its parent commit(s). Regular commits have one parent; merge commits have two parents. Branches are just named pointers to specific commits; they are not separate copies of the codebase.

HEAD is a pointer to the current branch, which in turn points to the latest commit on that branch. When you commit, a new node is added to the graph as a child of the current commit, and the branch pointer advances. This is why branching in Git is lightweight: creating a branch just creates a new pointer, not a copy of any files.`
      },
      {
        question: 'How do you detect and handle merge conflicts?',
        answer: `A merge conflict occurs when two branches modify the same file in different ways from a common ancestor. To detect conflicts, perform a three-way comparison: find the common ancestor commit (the most recent commit reachable from both branches), then compare each branch's version of every file against the ancestor's version.

If only one branch modified a file, take that branch's version (no conflict). If both branches modified the same file, check if the changes are the same (no conflict) or different (conflict). For conflicts, present both versions to the user and require manual resolution. Git's three-way merge algorithm works at the line level, so non-overlapping changes within the same file can be merged automatically.`
      }
    ],

    tips: [
      'Model the commit history as a DAG with parent pointers for efficient traversal',
      'Branches are just pointers to commits; creating a branch should be an O(1) operation',
      'Store complete snapshots per commit for simplicity; optimize with delta storage for production',
      'Use three-way merge (comparing against common ancestor) for accurate conflict detection',
      'Implement log as a reverse traversal of the commit chain following parent pointers'
    ]
  },
  {
    id: 'airline-management',
    title: 'Airline Management System',
    subtitle: 'Flight Operations & Booking Platform',
    icon: 'navigation',
    color: '#0ea5e9',
    difficulty: 'Hard',
    description: 'Design an airline management system handling flights, bookings, seat assignments, passengers, check-in, and boarding processes.',

    introduction: `An airline management system coordinates the end-to-end lifecycle of air travel: defining flight schedules, selling and managing seat inventory, processing passenger bookings, handling check-in (online and at kiosk/counter), and orchestrating the boarding process at the gate.

The design must handle concurrency challenges like multiple passengers booking the same seat simultaneously, overbooking strategies with bump logic, dynamic pricing based on demand, and real-time status updates when flights are delayed or canceled. The system interacts with payment gateways, notification services, and airport infrastructure systems.`,

    coreEntities: [
      { name: 'Flight', description: 'Scheduled flight with route (origin/destination), aircraft assignment, departure/arrival times, and status (scheduled, delayed, boarding, departed, arrived, canceled)' },
      { name: 'Aircraft', description: 'Physical plane with model, registration number, seat map layout, and maintenance status' },
      { name: 'Seat', description: 'Individual seat on an aircraft with class (economy, business, first), position (window, middle, aisle), and availability status' },
      { name: 'Passenger', description: 'Traveler with personal details, passport/ID info, frequent flyer number, and special requirements (meal, wheelchair)' },
      { name: 'Booking', description: 'Reservation linking passengers to flights with seat assignments, fare class, payment status, and booking reference (PNR)' },
      { name: 'BoardingPass', description: 'Issued after check-in with seat, gate, boarding group, barcode, and boarding sequence number' },
      { name: 'CheckInService', description: 'Handles passenger check-in (online/kiosk/counter), validates documents, assigns seats, issues boarding passes' },
      { name: 'BoardingManager', description: 'Manages gate operations: boarding group sequencing, passenger scanning, and manifest reconciliation' }
    ],

    designPatterns: [
      'State Pattern: Flight lifecycle (scheduled -> boarding -> departed -> arrived) and booking lifecycle (reserved -> confirmed -> checked-in -> boarded -> completed/canceled)',
      'Strategy Pattern: Pricing strategies (advance purchase, last-minute, dynamic yield management) and seat assignment strategies (random, window-first, balanced load)',
      'Observer Pattern: Notify passengers when flight status changes (delays, gate changes, cancellations)',
      'Command Pattern: Booking operations (reserve, confirm, cancel, modify) as undoable commands for handling failures and refunds',
      'Template Method: Check-in workflow varies by channel (online, kiosk, counter) but follows the same validation steps'
    ],

    implementation: `from enum import Enum
from datetime import datetime
from typing import Optional
import uuid

class FlightStatus(Enum):
    SCHEDULED = "scheduled"
    DELAYED = "delayed"
    BOARDING = "boarding"
    DEPARTED = "departed"
    ARRIVED = "arrived"
    CANCELED = "canceled"

class BookingStatus(Enum):
    RESERVED = "reserved"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    BOARDED = "boarded"
    COMPLETED = "completed"
    CANCELED = "canceled"

class SeatClass(Enum):
    ECONOMY = "economy"
    BUSINESS = "business"
    FIRST = "first"

class Seat:
    def __init__(self, row: int, letter: str, seat_class: SeatClass):
        self.row = row
        self.letter = letter
        self.seat_class = seat_class
        self.is_available = True

    @property
    def code(self) -> str:
        return f"{self.row}{self.letter}"

class Aircraft:
    def __init__(self, registration: str, model: str, seats: list[Seat]):
        self.registration = registration
        self.model = model
        self.seats = {s.code: s for s in seats}

    def available_seats(self, seat_class: SeatClass = None) -> list[Seat]:
        return [s for s in self.seats.values()
                if s.is_available and (seat_class is None or s.seat_class == seat_class)]

class Passenger:
    def __init__(self, name: str, passport_number: str, email: str):
        self.id = str(uuid.uuid4())
        self.name = name
        self.passport_number = passport_number
        self.email = email
        self.frequent_flyer_id: Optional[str] = None

class Flight:
    def __init__(self, flight_number: str, origin: str, destination: str,
                 departure: datetime, arrival: datetime, aircraft: Aircraft):
        self.flight_number = flight_number
        self.origin = origin
        self.destination = destination
        self.departure = departure
        self.arrival = arrival
        self.aircraft = aircraft
        self.status = FlightStatus.SCHEDULED
        self._observers = []

    def add_observer(self, observer):
        self._observers.append(observer)

    def update_status(self, new_status: FlightStatus):
        self.status = new_status
        for observer in self._observers:
            observer.on_flight_status_change(self, new_status)

class Booking:
    def __init__(self, passenger: Passenger, flight: Flight, seat: Seat, fare: float):
        self.pnr = self._generate_pnr()
        self.passenger = passenger
        self.flight = flight
        self.seat = seat
        self.fare = fare
        self.status = BookingStatus.RESERVED
        self.boarding_pass: Optional[BoardingPass] = None

    def _generate_pnr(self) -> str:
        return uuid.uuid4().hex[:6].upper()

    def confirm(self):
        self.status = BookingStatus.CONFIRMED
        self.seat.is_available = False

    def cancel(self):
        self.status = BookingStatus.CANCELED
        self.seat.is_available = True

class BoardingPass:
    def __init__(self, booking: Booking, gate: str, boarding_group: int):
        self.booking = booking
        self.gate = gate
        self.boarding_group = boarding_group
        self.barcode = uuid.uuid4().hex[:12].upper()
        self.issued_at = datetime.now()

class BookingService:
    def __init__(self):
        self.bookings: dict[str, Booking] = {}
        self._lock = __import__('threading').Lock()

    def create_booking(self, passenger: Passenger, flight: Flight,
                       seat_code: str, fare: float) -> Booking:
        with self._lock:
            seat = flight.aircraft.seats.get(seat_code)
            if not seat or not seat.is_available:
                raise ValueError(f"Seat {seat_code} is not available")
            booking = Booking(passenger, flight, seat, fare)
            booking.confirm()
            self.bookings[booking.pnr] = booking
            return booking

    def cancel_booking(self, pnr: str) -> float:
        booking = self.bookings.get(pnr)
        if not booking or booking.status == BookingStatus.CANCELED:
            raise ValueError("Booking not found or already canceled")
        booking.cancel()
        return booking.fare * 0.8  # 80% refund

class CheckInService:
    def check_in(self, booking: Booking, gate: str) -> BoardingPass:
        if booking.status != BookingStatus.CONFIRMED:
            raise ValueError("Booking must be confirmed to check in")
        boarding_group = self._assign_boarding_group(booking)
        boarding_pass = BoardingPass(booking, gate, boarding_group)
        booking.boarding_pass = boarding_pass
        booking.status = BookingStatus.CHECKED_IN
        return boarding_pass

    def _assign_boarding_group(self, booking: Booking) -> int:
        if booking.seat.seat_class == SeatClass.FIRST:
            return 1
        elif booking.seat.seat_class == SeatClass.BUSINESS:
            return 2
        return 3  # Economy`,

    keyQuestions: [
      {
        question: 'How do you handle concurrent seat bookings to prevent double-selling?',
        answer: `Use pessimistic locking at the seat level. When a passenger selects a seat, acquire a lock on that seat row in the database (SELECT ... FOR UPDATE). Validate availability, create the booking, mark the seat as taken, then release the lock. This prevents two transactions from reading the seat as available simultaneously.

For high-throughput systems, optimistic locking with versioning works better: each seat has a version number. The booking transaction reads the version, processes payment, then updates the seat with a WHERE version = read_version clause. If the version changed (someone else booked it), the transaction fails and the passenger is prompted to choose a different seat. This avoids holding locks during the slow payment step.`
      },
      {
        question: 'How would you implement an overbooking strategy?',
        answer: `Airlines overbook because a percentage of passengers (historically 5-15%) don't show up. The system maintains a virtual inventory that is larger than physical capacity. For a 200-seat plane with a 7% no-show rate, you might sell up to 214 seats.

The overbooking limit is calculated using historical no-show data per route, day-of-week, and season. When the flight is overbooked and all passengers show up, the system triggers a bump process: first seek volunteers with compensation offers (escalating from vouchers to cash), then involuntarily deny boarding based on check-in time, fare class, and frequent flyer status, while complying with regulations (e.g., EU261 compensation rules).`
      },
      {
        question: 'How do you handle flight cancellations and cascading rebookings?',
        answer: `When a flight is canceled, the system must rebook all affected passengers. First, notify all passengers via the Observer pattern. Then run a rebooking algorithm: find alternative flights on the same route within a time window (e.g., 24 hours), prioritize by fare class and frequent flyer tier, check seat availability on alternatives, and auto-rebook where possible.

For passengers who cannot be automatically rebooked (no available flights, connecting itineraries), escalate to a manual rebooking queue. The system must also handle refund processing, hotel accommodation for overnight delays, and meal vouchers. All rebooking operations must be idempotent to handle retries safely.`
      }
    ],

    tips: [
      'Use State pattern for both flight and booking lifecycles to enforce valid transitions',
      'Implement seat locking with a short TTL (5-10 minutes) during the booking flow to prevent abandoned reservations from blocking seats',
      'Separate read and write models: seat availability queries are high-frequency reads that benefit from caching',
      'Design the PNR (booking reference) as a short alphanumeric code that is easy to communicate verbally',
      'Handle timezone complexity carefully: store all times in UTC, display in local airport timezone'
    ]
  },
  {
    id: 'online-stock-brokerage',
    title: 'Online Stock Brokerage',
    subtitle: 'Trading Platform & Order Matching',
    icon: 'trendingUp',
    color: '#22c55e',
    difficulty: 'Hard',
    description: 'Design an online stock brokerage system with trading, order management (market/limit/stop), portfolios, market data feeds, and an order matching engine.',

    introduction: `An online stock brokerage enables users to buy and sell financial instruments (stocks, ETFs, options). The core challenge is building a reliable order matching engine that pairs buy and sell orders fairly and efficiently, while maintaining real-time portfolio valuations and streaming market data to thousands of concurrent users.

The system must handle strict ordering guarantees (price-time priority), support multiple order types (market, limit, stop, stop-limit), manage partial fills, and provide an accurate audit trail for regulatory compliance. Latency is critical: professional trading platforms target sub-millisecond order processing.`,

    coreEntities: [
      { name: 'Order', description: 'Trade instruction with type (market/limit/stop), side (buy/sell), symbol, quantity, price, status, and timestamps' },
      { name: 'OrderBook', description: 'Per-symbol structure maintaining sorted buy (bid) and sell (ask) orders with price-time priority' },
      { name: 'MatchingEngine', description: 'Core engine that matches incoming orders against the order book and produces trades' },
      { name: 'Trade', description: 'Executed transaction recording buyer, seller, price, quantity, and execution timestamp' },
      { name: 'Portfolio', description: 'User holdings with positions (symbol, quantity, avg cost), cash balance, and real-time P&L' },
      { name: 'MarketDataFeed', description: 'Real-time streaming of quotes (bid/ask), last trade price, volume, and candlestick data' },
      { name: 'Account', description: 'Brokerage account with user info, buying power, margin requirements, and order history' },
      { name: 'RiskManager', description: 'Pre-trade validation: sufficient funds, position limits, margin requirements, and circuit breakers' }
    ],

    designPatterns: [
      'Command Pattern: Each order is a command object that can be submitted, modified, or canceled with full audit logging',
      'Observer Pattern: Market data subscribers receive real-time price updates when trades execute',
      'Strategy Pattern: Different order types (market, limit, stop) use different matching strategies',
      'Mediator Pattern: The matching engine mediates between buy and sell orders without them knowing about each other',
      'Event Sourcing: Store every order event (placed, partially filled, fully filled, canceled) as an immutable log for audit and replay'
    ],

    implementation: `from enum import Enum
from datetime import datetime
from collections import defaultdict
from sortedcontainers import SortedList
import uuid
import threading

class OrderSide(Enum):
    BUY = "buy"
    SELL = "sell"

class OrderType(Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"

class OrderStatus(Enum):
    PENDING = "pending"
    OPEN = "open"
    PARTIALLY_FILLED = "partially_filled"
    FILLED = "filled"
    CANCELED = "canceled"

class Order:
    def __init__(self, account_id: str, symbol: str, side: OrderSide,
                 order_type: OrderType, quantity: int, price: float = None):
        self.id = str(uuid.uuid4())
        self.account_id = account_id
        self.symbol = symbol
        self.side = side
        self.order_type = order_type
        self.quantity = quantity
        self.price = price
        self.filled_quantity = 0
        self.status = OrderStatus.PENDING
        self.created_at = datetime.now()

    @property
    def remaining(self) -> int:
        return self.quantity - self.filled_quantity

class Trade:
    def __init__(self, buy_order: Order, sell_order: Order,
                 price: float, quantity: int):
        self.id = str(uuid.uuid4())
        self.buy_order_id = buy_order.id
        self.sell_order_id = sell_order.id
        self.symbol = buy_order.symbol
        self.price = price
        self.quantity = quantity
        self.executed_at = datetime.now()

class OrderBook:
    """Per-symbol order book with price-time priority."""
    def __init__(self, symbol: str):
        self.symbol = symbol
        # Bids sorted by price DESC, then time ASC
        self.bids: list[Order] = []  # Buy orders
        # Asks sorted by price ASC, then time ASC
        self.asks: list[Order] = []  # Sell orders

    def add_order(self, order: Order):
        if order.side == OrderSide.BUY:
            self.bids.append(order)
            self.bids.sort(key=lambda o: (-o.price, o.created_at))
        else:
            self.asks.append(order)
            self.asks.sort(key=lambda o: (o.price, o.created_at))

    def best_bid(self) -> float:
        return self.bids[0].price if self.bids else 0

    def best_ask(self) -> float:
        return self.asks[0].price if self.asks else float('inf')

class MatchingEngine:
    def __init__(self):
        self.order_books: dict[str, OrderBook] = {}
        self.trades: list[Trade] = []
        self._lock = threading.Lock()
        self._observers = []

    def _get_order_book(self, symbol: str) -> OrderBook:
        if symbol not in self.order_books:
            self.order_books[symbol] = OrderBook(symbol)
        return self.order_books[symbol]

    def submit_order(self, order: Order) -> list[Trade]:
        with self._lock:
            book = self._get_order_book(order.symbol)
            trades = self._match(order, book)
            if order.remaining > 0 and order.order_type == OrderType.LIMIT:
                order.status = OrderStatus.OPEN
                book.add_order(order)
            for trade in trades:
                self._notify_observers(trade)
            return trades

    def _match(self, order: Order, book: OrderBook) -> list[Trade]:
        trades = []
        opposite = book.asks if order.side == OrderSide.BUY else book.bids

        while order.remaining > 0 and opposite:
            best = opposite[0]
            if order.side == OrderSide.BUY:
                if order.order_type == OrderType.LIMIT and order.price < best.price:
                    break  # No match at this price
            else:
                if order.order_type == OrderType.LIMIT and order.price > best.price:
                    break

            fill_qty = min(order.remaining, best.remaining)
            fill_price = best.price  # Price-time priority: resting order's price

            trade = Trade(
                buy_order=order if order.side == OrderSide.BUY else best,
                sell_order=best if order.side == OrderSide.BUY else order,
                price=fill_price, quantity=fill_qty
            )
            trades.append(trade)

            order.filled_quantity += fill_qty
            best.filled_quantity += fill_qty

            if best.remaining == 0:
                best.status = OrderStatus.FILLED
                opposite.pop(0)
            else:
                best.status = OrderStatus.PARTIALLY_FILLED

        if order.filled_quantity == order.quantity:
            order.status = OrderStatus.FILLED
        elif order.filled_quantity > 0:
            order.status = OrderStatus.PARTIALLY_FILLED
        return trades

    def add_observer(self, observer):
        self._observers.append(observer)

    def _notify_observers(self, trade: Trade):
        for obs in self._observers:
            obs.on_trade(trade)

class Portfolio:
    def __init__(self, account_id: str, cash: float):
        self.account_id = account_id
        self.cash = cash
        self.positions: dict[str, dict] = {}  # symbol -> {quantity, avg_cost}

    def update_on_trade(self, trade: Trade, side: OrderSide):
        symbol = trade.symbol
        if symbol not in self.positions:
            self.positions[symbol] = {"quantity": 0, "avg_cost": 0.0}
        pos = self.positions[symbol]
        if side == OrderSide.BUY:
            total_cost = pos["avg_cost"] * pos["quantity"] + trade.price * trade.quantity
            pos["quantity"] += trade.quantity
            pos["avg_cost"] = total_cost / pos["quantity"] if pos["quantity"] else 0
            self.cash -= trade.price * trade.quantity
        else:
            pos["quantity"] -= trade.quantity
            self.cash += trade.price * trade.quantity`,

    keyQuestions: [
      {
        question: 'How does the order matching engine ensure fairness?',
        answer: `The matching engine uses price-time priority (also called FIFO within price level). Orders are first ranked by price: the highest bid and lowest ask get priority. Among orders at the same price, the one that arrived first gets filled first. This is the standard used by most stock exchanges.

When a new order arrives, it is matched against the opposite side of the book. A market buy order matches against the lowest-priced sell order. A limit buy at $50 matches against any sell order at $50 or lower. The trade executes at the resting order's price (the order already in the book), which ensures the incoming order gets at least as good a price as requested. Partial fills occur when the incoming order is larger than the best resting order.`
      },
      {
        question: 'How do you handle stop orders and stop-limit orders?',
        answer: `A stop order becomes a market order when the market price reaches the stop price. A stop-limit order becomes a limit order when triggered. The system maintains a separate list of stop orders per symbol, sorted by trigger price. After each trade execution, check if the trade price has crossed any stop prices.

For a stop-loss sell at $45: when the market price drops to $45 or below, convert it to a market sell order and submit it to the matching engine. For a stop-limit sell at stop=$45, limit=$44: when triggered, it becomes a limit sell at $44 (it won't execute below $44, protecting against slippage in a fast-moving market). Stop orders must be evaluated atomically after each trade to prevent race conditions.`
      },
      {
        question: 'How do you ensure the system handles high throughput reliably?',
        answer: `The matching engine is the bottleneck and must be single-threaded per symbol to guarantee ordering. Partition order books by symbol across multiple matching engine instances (symbol-level sharding). Each instance processes orders sequentially for its assigned symbols, avoiding lock contention.

Use an event-sourced architecture: every order submission, modification, cancellation, and trade is an immutable event in a log (e.g., Kafka). The matching engine reads from this log and writes trade events back. This enables replay for disaster recovery, audit compliance, and building read-optimized projections (portfolio values, market data feeds). Market data and portfolio updates are downstream consumers that can scale independently.`
      }
    ],

    tips: [
      'Keep the matching engine single-threaded per symbol for correctness; shard across symbols for throughput',
      'Use price-time priority (FIFO within price level) as the default matching algorithm',
      'Validate orders before they reach the matching engine: sufficient funds, position limits, valid price',
      'Separate the hot path (order matching) from cold paths (market data fan-out, portfolio updates)',
      'Event source all order and trade events for regulatory audit trails and system recovery'
    ]
  },
  {
    id: 'hotel-management-lld',
    title: 'Hotel Management System',
    subtitle: 'Reservations, Billing & Operations',
    icon: 'home',
    color: '#a855f7',
    difficulty: 'Medium',
    description: 'Design a hotel management system covering rooms, reservations, billing, housekeeping, room types, and seasonal pricing.',

    introduction: `A hotel management system (Property Management System or PMS) is the operational backbone of a hotel. It coordinates room inventory, guest reservations, check-in/check-out, billing, housekeeping schedules, and pricing. The system must handle complex scenarios like overbooking, group bookings, room upgrades, early check-in/late check-out, and dynamic pricing based on occupancy and seasonality.

Key design challenges include managing room state transitions (available -> reserved -> occupied -> cleaning -> available), calculating charges with multiple rate plans and add-on services, and ensuring accurate real-time availability across multiple booking channels (direct, OTAs like Booking.com/Expedia).`,

    coreEntities: [
      { name: 'Room', description: 'Physical room with number, floor, type, status (available, reserved, occupied, maintenance, cleaning), and amenities list' },
      { name: 'RoomType', description: 'Category like Standard, Deluxe, Suite with base rate, max occupancy, bed configuration, and description' },
      { name: 'Reservation', description: 'Booking with guest, room type, check-in/check-out dates, status, special requests, and payment info' },
      { name: 'Guest', description: 'Customer with personal details, loyalty tier, stay history, and preferences' },
      { name: 'Invoice', description: 'Itemized bill with room charges, taxes, services (minibar, room service, spa), and payment records' },
      { name: 'HousekeepingTask', description: 'Cleaning assignment with room, priority, assigned staff, status, and completion time' },
      { name: 'PricingEngine', description: 'Calculates room rates based on room type, season, occupancy level, length of stay, and promotions' },
      { name: 'BookingChannel', description: 'Source of reservation (direct, OTA, corporate, travel agent) with commission rates' }
    ],

    designPatterns: [
      'State Pattern: Room status transitions (available -> reserved -> occupied -> cleaning -> available) with validation rules for each transition',
      'Strategy Pattern: Multiple pricing strategies (seasonal, occupancy-based, length-of-stay discount, corporate rate, loyalty discount)',
      'Observer Pattern: Notify housekeeping when a room is checked out, notify front desk when cleaning is complete',
      'Factory Pattern: Create different room types with appropriate amenities, rates, and configurations',
      'Decorator Pattern: Add-on services (breakfast, airport transfer, late checkout) layered onto the base reservation'
    ],

    implementation: `from enum import Enum
from datetime import datetime, date, timedelta
from typing import Optional
import uuid

class RoomStatus(Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    OCCUPIED = "occupied"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"

class ReservationStatus(Enum):
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELED = "canceled"
    NO_SHOW = "no_show"

class RoomType:
    def __init__(self, name: str, base_rate: float, max_occupancy: int,
                 bed_config: str, amenities: list[str]):
        self.name = name
        self.base_rate = base_rate
        self.max_occupancy = max_occupancy
        self.bed_config = bed_config
        self.amenities = amenities

class Room:
    def __init__(self, number: str, floor: int, room_type: RoomType):
        self.number = number
        self.floor = floor
        self.room_type = room_type
        self.status = RoomStatus.AVAILABLE

    def transition_to(self, new_status: RoomStatus):
        valid = {
            RoomStatus.AVAILABLE: [RoomStatus.RESERVED, RoomStatus.MAINTENANCE],
            RoomStatus.RESERVED: [RoomStatus.OCCUPIED, RoomStatus.AVAILABLE],
            RoomStatus.OCCUPIED: [RoomStatus.CLEANING],
            RoomStatus.CLEANING: [RoomStatus.AVAILABLE, RoomStatus.MAINTENANCE],
            RoomStatus.MAINTENANCE: [RoomStatus.AVAILABLE],
        }
        if new_status not in valid.get(self.status, []):
            raise ValueError(f"Cannot transition from {self.status} to {new_status}")
        self.status = new_status

class Guest:
    def __init__(self, name: str, email: str, phone: str):
        self.id = str(uuid.uuid4())
        self.name = name
        self.email = email
        self.phone = phone
        self.loyalty_points = 0
        self.stay_history: list[str] = []

class PricingEngine:
    def __init__(self):
        self.seasonal_multipliers: dict[str, float] = {}  # "2024-12": 1.5

    def set_seasonal_rate(self, month_key: str, multiplier: float):
        self.seasonal_multipliers[month_key] = multiplier

    def calculate_rate(self, room_type: RoomType, check_in: date,
                       check_out: date, occupancy_pct: float) -> float:
        nights = (check_out - check_in).days
        total = 0.0
        current = check_in
        for _ in range(nights):
            month_key = current.strftime("%Y-%m")
            seasonal = self.seasonal_multipliers.get(month_key, 1.0)
            # Occupancy surge: +20% when above 85% occupancy
            occupancy_adj = 1.2 if occupancy_pct > 0.85 else 1.0
            daily_rate = room_type.base_rate * seasonal * occupancy_adj
            total += daily_rate
            current += timedelta(days=1)
        return round(total, 2)

class Reservation:
    def __init__(self, guest: Guest, room: Room, check_in: date,
                 check_out: date, rate: float):
        self.id = str(uuid.uuid4())
        self.confirmation_number = uuid.uuid4().hex[:8].upper()
        self.guest = guest
        self.room = room
        self.check_in = check_in
        self.check_out = check_out
        self.nightly_rate = rate / (check_out - check_in).days
        self.total_rate = rate
        self.status = ReservationStatus.CONFIRMED
        self.charges: list[dict] = []
        self.room.transition_to(RoomStatus.RESERVED)

    def add_charge(self, description: str, amount: float):
        self.charges.append({
            "description": description,
            "amount": amount,
            "timestamp": datetime.now()
        })

    def total_bill(self) -> float:
        extra = sum(c["amount"] for c in self.charges)
        return self.total_rate + extra

class HousekeepingTask:
    def __init__(self, room: Room, priority: int = 1):
        self.id = str(uuid.uuid4())
        self.room = room
        self.priority = priority
        self.assigned_to: Optional[str] = None
        self.completed = False

    def complete(self):
        self.completed = True
        self.room.transition_to(RoomStatus.AVAILABLE)

class HotelService:
    def __init__(self, pricing_engine: PricingEngine):
        self.rooms: dict[str, Room] = {}
        self.reservations: dict[str, Reservation] = {}
        self.housekeeping_queue: list[HousekeepingTask] = []
        self.pricing = pricing_engine

    def check_in(self, reservation_id: str):
        res = self.reservations[reservation_id]
        res.status = ReservationStatus.CHECKED_IN
        res.room.transition_to(RoomStatus.OCCUPIED)

    def check_out(self, reservation_id: str) -> float:
        res = self.reservations[reservation_id]
        res.status = ReservationStatus.CHECKED_OUT
        res.room.transition_to(RoomStatus.CLEANING)
        task = HousekeepingTask(res.room)
        self.housekeeping_queue.append(task)
        return res.total_bill()`,

    keyQuestions: [
      {
        question: 'How do you implement dynamic seasonal pricing?',
        answer: `Dynamic pricing uses multiple factors layered together. The base layer is the room type rate. On top of that, apply a seasonal multiplier (e.g., 1.5x for December holidays, 0.8x for off-season January). Then apply occupancy-based adjustments: when occupancy exceeds 85%, increase rates by 15-25%. Length-of-stay discounts (e.g., 10% off for 7+ nights) can offset the increase for longer bookings.

Store pricing rules as a strategy pattern with a chain of adjustments. Each PricingRule takes the current rate and context (date, occupancy, guest loyalty tier) and returns an adjusted rate. This makes it easy to add new rules (flash sales, corporate rates, loyalty discounts) without modifying the core pricing logic. Cache computed rates for common date ranges and invalidate when rules change.`
      },
      {
        question: 'How do you handle overbooking and room assignment?',
        answer: `Hotels commonly overbook by 5-10% because of cancellations and no-shows. Reservations are made against room types, not specific rooms. Specific room assignment happens at check-in time, giving the hotel flexibility to manage inventory.

When a guest arrives and no room of the booked type is available, the system attempts an upgrade: assign a higher-tier room at no extra charge. If no rooms are available at all, the system triggers a walk protocol: find the guest a room at a nearby partner hotel, cover the cost difference, and offer compensation (future stay credit, loyalty points). Track overbooking rates and actual walk rates to calibrate the overbooking percentage per room type and season.`
      },
      {
        question: 'How do you coordinate housekeeping efficiently?',
        answer: `Housekeeping tasks are generated automatically on checkout and prioritized by urgency. Priority 1: rooms with incoming same-day reservations. Priority 2: checkout rooms without same-day reservations. Priority 3: stay-over rooms needing daily service. Priority 4: deep cleaning rotation.

Assign tasks based on proximity (rooms on the same floor assigned to the same housekeeper), staff skill level (suites assigned to senior housekeepers), and workload balance. The system tracks average cleaning time per room type to estimate completion times. When a housekeeper marks a room clean, an Observer notification updates the room status to available and alerts the front desk if a guest is waiting for that room type.`
      }
    ],

    tips: [
      'Separate reservation (room type) from room assignment (specific room) for maximum flexibility',
      'Use State pattern with strict transition validation to prevent invalid room status changes',
      'Implement pricing as composable rules that can be stacked and reordered',
      'Track housekeeping metrics (avg cleaning time, rooms per shift) to optimize staffing',
      'Design for multi-channel availability: keep a single source of truth for inventory that all channels query'
    ]
  },
  {
    id: 'blackjack-card-game',
    title: 'Blackjack Card Game',
    subtitle: 'Casino Card Game Simulation',
    icon: 'square',
    color: '#ef4444',
    difficulty: 'Medium',
    description: 'Design a Blackjack game with deck management, hand evaluation, dealer AI, betting, and player actions (hit, stand, split, double down).',

    introduction: `Blackjack (Twenty-One) is one of the most popular casino card games and a classic OOD interview problem. The player competes against the dealer, trying to get a hand value as close to 21 as possible without exceeding it. The design must model cards, decks (often a shoe of 6-8 decks), hand evaluation (with Ace counting as 1 or 11), dealer behavior (fixed rules: hit on 16 or below, stand on 17+), and player actions (hit, stand, split pairs, double down).

Key design challenges include correctly handling Aces (which can be 1 or 11 dynamically as cards are added), implementing split logic (creating new hands from pairs), managing the betting lifecycle (bet -> play -> payout), and simulating a multi-deck shoe with cut card and reshuffling.`,

    coreEntities: [
      { name: 'Card', description: 'Playing card with suit (hearts, diamonds, clubs, spades) and rank (2-10, J, Q, K, A) with value calculation' },
      { name: 'Deck', description: 'Standard 52-card deck with shuffle capability' },
      { name: 'Shoe', description: 'Container of multiple decks (typically 6-8) with a cut card indicating when to reshuffle' },
      { name: 'Hand', description: 'Collection of cards with value calculation, soft/hard distinction, and blackjack detection' },
      { name: 'Player', description: 'Participant with name, chip balance, current hands (can have multiple after split), and bet amounts' },
      { name: 'Dealer', description: 'Special player with fixed strategy (hit below 17, stand on 17+) and one card face-down during play' },
      { name: 'BlackjackGame', description: 'Game controller managing rounds: deal, player turns, dealer turn, payout' },
      { name: 'BettingManager', description: 'Handles bet placement, validation, and payout calculation (1:1, 3:2 for blackjack, push)' }
    ],

    designPatterns: [
      'Strategy Pattern: Player actions (hit, stand, split, double) as strategies; dealer uses a fixed strategy',
      'State Pattern: Round phases (betting -> dealing -> player_turn -> dealer_turn -> payout) as states',
      'Iterator Pattern: Shoe deals cards sequentially; reshuffles when cut card is reached',
      'Observer Pattern: UI observers notified of game events (card dealt, bust, blackjack, payout)',
      'Factory Pattern: Create standard 52-card decks and assemble them into shoes'
    ],

    implementation: `from enum import Enum
import random

class Suit(Enum):
    HEARTS = "hearts"
    DIAMONDS = "diamonds"
    CLUBS = "clubs"
    SPADES = "spades"

class Rank(Enum):
    TWO = 2; THREE = 3; FOUR = 4; FIVE = 5
    SIX = 6; SEVEN = 7; EIGHT = 8; NINE = 9; TEN = 10
    JACK = 11; QUEEN = 12; KING = 13; ACE = 14

class Card:
    def __init__(self, rank: Rank, suit: Suit):
        self.rank = rank
        self.suit = suit

    @property
    def value(self) -> int:
        if self.rank in (Rank.JACK, Rank.QUEEN, Rank.KING):
            return 10
        if self.rank == Rank.ACE:
            return 11  # Adjusted dynamically in Hand
        return self.rank.value

    def __repr__(self):
        return f"{self.rank.name} of {self.suit.name}"

class Shoe:
    def __init__(self, num_decks: int = 6):
        self.num_decks = num_decks
        self.cards: list[Card] = []
        self.cut_position = 0
        self._build_and_shuffle()

    def _build_and_shuffle(self):
        self.cards = [Card(rank, suit)
                      for _ in range(self.num_decks)
                      for suit in Suit
                      for rank in Rank]
        random.shuffle(self.cards)
        # Cut card at ~75% depth
        self.cut_position = int(len(self.cards) * 0.75)

    def deal_card(self) -> Card:
        if not self.cards:
            self._build_and_shuffle()
        return self.cards.pop()

    def needs_reshuffle(self) -> bool:
        return len(self.cards) <= (self.num_decks * 52 - self.cut_position)

class Hand:
    def __init__(self):
        self.cards: list[Card] = []

    def add_card(self, card: Card):
        self.cards.append(card)

    @property
    def value(self) -> int:
        total = sum(c.value for c in self.cards)
        aces = sum(1 for c in self.cards if c.rank == Rank.ACE)
        while total > 21 and aces > 0:
            total -= 10  # Count Ace as 1 instead of 11
            aces -= 1
        return total

    @property
    def is_soft(self) -> bool:
        """A hand is soft if it contains an Ace counted as 11."""
        total = sum(c.value for c in self.cards)
        aces = sum(1 for c in self.cards if c.rank == Rank.ACE)
        while total > 21 and aces > 0:
            total -= 10
            aces -= 1
        return aces > 0 and total <= 21

    @property
    def is_blackjack(self) -> bool:
        return len(self.cards) == 2 and self.value == 21

    @property
    def is_bust(self) -> bool:
        return self.value > 21

    @property
    def can_split(self) -> bool:
        return len(self.cards) == 2 and self.cards[0].value == self.cards[1].value

class Player:
    def __init__(self, name: str, chips: float = 1000):
        self.name = name
        self.chips = chips
        self.hands: list[Hand] = []
        self.bets: list[float] = []

    def place_bet(self, amount: float) -> bool:
        if amount > self.chips:
            return False
        self.chips -= amount
        self.hands = [Hand()]
        self.bets = [amount]
        return True

    def split(self, hand_index: int = 0):
        hand = self.hands[hand_index]
        if not hand.can_split or self.chips < self.bets[hand_index]:
            raise ValueError("Cannot split")
        new_hand = Hand()
        new_hand.add_card(hand.cards.pop())
        self.hands.insert(hand_index + 1, new_hand)
        self.chips -= self.bets[hand_index]
        self.bets.insert(hand_index + 1, self.bets[hand_index])

    def double_down(self, hand_index: int = 0):
        if self.chips < self.bets[hand_index]:
            raise ValueError("Insufficient chips to double down")
        self.chips -= self.bets[hand_index]
        self.bets[hand_index] *= 2

class Dealer:
    def __init__(self):
        self.hand = Hand()

    def should_hit(self) -> bool:
        return self.hand.value < 17

    def reset(self):
        self.hand = Hand()

class BlackjackGame:
    def __init__(self, num_decks: int = 6):
        self.shoe = Shoe(num_decks)
        self.dealer = Dealer()
        self.players: list[Player] = []

    def deal_initial(self):
        self.dealer.reset()
        for _ in range(2):
            for player in self.players:
                for hand in player.hands:
                    hand.add_card(self.shoe.deal_card())
            self.dealer.hand.add_card(self.shoe.deal_card())

    def player_hit(self, player: Player, hand_index: int = 0):
        hand = player.hands[hand_index]
        hand.add_card(self.shoe.deal_card())
        return hand.is_bust

    def dealer_play(self):
        while self.dealer.should_hit():
            self.dealer.hand.add_card(self.shoe.deal_card())

    def resolve_bets(self):
        dealer_val = self.dealer.hand.value
        dealer_bust = self.dealer.hand.is_bust
        for player in self.players:
            for i, hand in enumerate(player.hands):
                bet = player.bets[i]
                if hand.is_bust:
                    continue  # Player already lost
                if hand.is_blackjack and not self.dealer.hand.is_blackjack:
                    player.chips += bet * 2.5  # 3:2 payout
                elif dealer_bust or hand.value > dealer_val:
                    player.chips += bet * 2    # 1:1 payout
                elif hand.value == dealer_val:
                    player.chips += bet        # Push
                # else: player loses (bet already deducted)`,

    keyQuestions: [
      {
        question: 'How do you handle the dynamic value of Aces?',
        answer: `Aces are always initially valued at 11. The Hand's value property sums all card values (with Aces as 11), then iteratively reduces Aces from 11 to 1 whenever the total exceeds 21. This greedy approach is optimal because reducing an Ace from 11 to 1 always brings the total down by exactly 10, and you never want to reduce more Aces than necessary.

A hand is called "soft" if it contains an Ace still counted as 11 (meaning the player can safely hit without busting, since the Ace can be reduced). For example, Ace + 6 = soft 17. If the next card is an 8, the total would be 25, but the Ace reduces to 1, making it 15 (hard 15). This distinction matters for dealer rules: some casinos require the dealer to hit on soft 17.`
      },
      {
        question: 'How do you implement the split action correctly?',
        answer: `When a player splits, the original hand's two cards are separated into two independent hands, each receiving one additional card. The player must place an equal bet on the new hand. Each hand is then played independently in sequence.

Edge cases to handle: splitting Aces typically allows only one additional card per hand (no further hits). Re-splitting is allowed if the new card forms another pair (up to a maximum of 4 hands). A 21 after a split is NOT a blackjack (it pays 1:1, not 3:2). Doubling after split may or may not be allowed depending on house rules. The implementation uses a list of hands per player, with the split operation inserting a new Hand at the next index.`
      },
      {
        question: 'Why use a Shoe instead of a single deck, and how does the cut card work?',
        answer: `A shoe with 6-8 decks makes card counting significantly harder. With a single deck, a skilled counter can gain a meaningful edge by tracking which cards have been played. Multiple decks dilute this advantage because removing a few cards has a smaller effect on the remaining deck composition.

The cut card is placed at approximately 75% depth in the shoe. When the cut card is reached during a round, the current round completes normally, and then the shoe is reshuffled before the next round. This prevents players from knowing the exact composition of the remaining cards. The penetration depth (how far into the shoe before reshuffling) is a configurable parameter that balances game pace against card counting countermeasures.`
      }
    ],

    tips: [
      'Model Ace values dynamically in the Hand class, not in the Card class',
      'Use a State pattern for round phases to prevent invalid actions (no hitting during the betting phase)',
      'Keep the dealer logic as a simple strategy with no decision-making: hit below 17, stand on 17+',
      'Handle split as creating a new Hand from the second card, preserving the first card in the original hand',
      'Track the shoe penetration and reshuffle threshold as configurable game rules'
    ]
  },
  {
    id: 'movie-ticket-booking',
    title: 'Movie Ticket Booking',
    subtitle: 'Theater Seat Reservation System',
    icon: 'film',
    color: '#ec4899',
    difficulty: 'Hard',
    description: 'Design a movie ticket booking system with theaters, shows, seat selection, concurrency control (seat locking), payment processing, and cancellation.',

    introduction: `A movie ticket booking system (like BookMyShow or Fandango) lets users browse movies, select showtimes, choose seats, and purchase tickets. The primary technical challenge is concurrency: when hundreds of users try to book seats for a popular show simultaneously, the system must prevent double-booking while providing a smooth user experience.

The design must handle seat selection with temporary locks (so a user has time to complete payment without losing their seats), graceful expiry of abandoned selections, multiple theaters with different seating layouts, dynamic pricing (premium seats, peak hours), and reliable payment integration with rollback on failure.`,

    coreEntities: [
      { name: 'Movie', description: 'Film with title, duration, genre, rating, release date, and poster' },
      { name: 'Theater', description: 'Venue with name, location, and multiple screens' },
      { name: 'Screen', description: 'Auditorium within a theater with seat layout (rows, columns, categories) and equipment (IMAX, Dolby, standard)' },
      { name: 'Show', description: 'Specific screening of a movie on a screen at a date/time with its own seat availability and pricing' },
      { name: 'Seat', description: 'Individual seat with row, number, category (standard, premium, VIP), and per-show availability status' },
      { name: 'SeatLock', description: 'Temporary hold on selected seats with expiry timestamp, preventing others from booking during payment' },
      { name: 'Booking', description: 'Confirmed reservation with user, show, seats, total price, payment reference, and cancellation policy' },
      { name: 'PaymentTransaction', description: 'Payment record with amount, method, status (pending, completed, refunded), and gateway reference' }
    ],

    designPatterns: [
      'State Pattern: Seat availability per show (available -> locked -> booked -> canceled) with timed transitions',
      'Strategy Pattern: Pricing strategies per seat category, show time (matinee vs evening), and day (weekday vs weekend)',
      'Observer Pattern: Notify users on waitlist when canceled seats become available',
      'Repository Pattern: Separate data access for movies, shows, bookings with caching for read-heavy queries',
      'Saga Pattern: Multi-step booking (lock seats -> charge payment -> confirm booking) with compensation on failure'
    ],

    implementation: `from enum import Enum
from datetime import datetime, timedelta
from typing import Optional
import uuid
import threading

class SeatStatus(Enum):
    AVAILABLE = "available"
    LOCKED = "locked"
    BOOKED = "booked"

class SeatCategory(Enum):
    STANDARD = "standard"
    PREMIUM = "premium"
    VIP = "vip"

class Movie:
    def __init__(self, title: str, duration_min: int, genre: str, rating: str):
        self.id = str(uuid.uuid4())
        self.title = title
        self.duration_min = duration_min
        self.genre = genre
        self.rating = rating

class Seat:
    def __init__(self, row: str, number: int, category: SeatCategory):
        self.row = row
        self.number = number
        self.category = category

    @property
    def code(self) -> str:
        return f"{self.row}{self.number}"

class ShowSeat:
    """Seat availability for a specific show."""
    def __init__(self, seat: Seat, price: float):
        self.seat = seat
        self.price = price
        self.status = SeatStatus.AVAILABLE
        self.locked_by: Optional[str] = None
        self.lock_expiry: Optional[datetime] = None

class Screen:
    def __init__(self, name: str, seats: list[Seat]):
        self.name = name
        self.seats = seats

class Show:
    def __init__(self, movie: Movie, screen: Screen, start_time: datetime,
                 pricing: dict):  # {SeatCategory: price}
        self.id = str(uuid.uuid4())
        self.movie = movie
        self.screen = screen
        self.start_time = start_time
        self.show_seats: dict[str, ShowSeat] = {}
        for seat in screen.seats:
            price = pricing.get(seat.category, 10.0)
            self.show_seats[seat.code] = ShowSeat(seat, price)

class SeatLockManager:
    LOCK_DURATION = timedelta(minutes=8)

    def __init__(self):
        self._lock = threading.Lock()

    def lock_seats(self, show: Show, seat_codes: list[str],
                   user_id: str) -> bool:
        with self._lock:
            now = datetime.now()
            # First, expire any stale locks
            for code in seat_codes:
                ss = show.show_seats[code]
                if (ss.status == SeatStatus.LOCKED and
                        ss.lock_expiry and ss.lock_expiry < now):
                    ss.status = SeatStatus.AVAILABLE
                    ss.locked_by = None
                    ss.lock_expiry = None

            # Check all seats are available
            for code in seat_codes:
                ss = show.show_seats[code]
                if ss.status != SeatStatus.AVAILABLE:
                    return False

            # Lock all seats atomically
            expiry = now + self.LOCK_DURATION
            for code in seat_codes:
                ss = show.show_seats[code]
                ss.status = SeatStatus.LOCKED
                ss.locked_by = user_id
                ss.lock_expiry = expiry
            return True

    def release_locks(self, show: Show, seat_codes: list[str], user_id: str):
        with self._lock:
            for code in seat_codes:
                ss = show.show_seats[code]
                if ss.locked_by == user_id:
                    ss.status = SeatStatus.AVAILABLE
                    ss.locked_by = None
                    ss.lock_expiry = None

    def confirm_seats(self, show: Show, seat_codes: list[str],
                      user_id: str) -> bool:
        with self._lock:
            for code in seat_codes:
                ss = show.show_seats[code]
                if ss.locked_by != user_id or ss.status != SeatStatus.LOCKED:
                    return False
            for code in seat_codes:
                ss = show.show_seats[code]
                ss.status = SeatStatus.BOOKED
                ss.locked_by = None
                ss.lock_expiry = None
            return True

class Booking:
    def __init__(self, user_id: str, show: Show, seat_codes: list[str]):
        self.id = str(uuid.uuid4())
        self.user_id = user_id
        self.show = show
        self.seat_codes = seat_codes
        self.total_price = sum(show.show_seats[c].price for c in seat_codes)
        self.status = "confirmed"
        self.created_at = datetime.now()

    def cancel(self) -> float:
        hours_until_show = (self.show.start_time - datetime.now()).total_seconds() / 3600
        if hours_until_show < 2:
            raise ValueError("Cannot cancel within 2 hours of showtime")
        self.status = "canceled"
        for code in self.seat_codes:
            self.show.show_seats[code].status = SeatStatus.AVAILABLE
        # Refund policy: 100% if >24h, 50% if 2-24h
        refund_pct = 1.0 if hours_until_show > 24 else 0.5
        return self.total_price * refund_pct

class BookingService:
    def __init__(self):
        self.seat_lock_mgr = SeatLockManager()
        self.bookings: dict[str, Booking] = {}

    def initiate_booking(self, show: Show, seat_codes: list[str],
                         user_id: str) -> bool:
        return self.seat_lock_mgr.lock_seats(show, seat_codes, user_id)

    def complete_booking(self, show: Show, seat_codes: list[str],
                         user_id: str, payment_ref: str) -> Booking:
        if not self.seat_lock_mgr.confirm_seats(show, seat_codes, user_id):
            raise ValueError("Seats no longer locked for this user")
        booking = Booking(user_id, show, seat_codes)
        self.bookings[booking.id] = booking
        return booking

    def cancel_booking(self, booking_id: str) -> float:
        booking = self.bookings.get(booking_id)
        if not booking:
            raise ValueError("Booking not found")
        return booking.cancel()`,

    keyQuestions: [
      {
        question: 'How do you prevent two users from booking the same seat?',
        answer: `Use a two-phase locking mechanism. Phase 1 (Selection): when a user selects seats, acquire a temporary lock with a TTL (e.g., 8 minutes). The lock is stored with the user ID and expiry timestamp. Other users see these seats as unavailable. Phase 2 (Confirmation): after successful payment, convert the lock to a permanent booking.

At the database level, use SELECT ... FOR UPDATE on the seat rows to get an exclusive lock during the check-and-set operation. The lock acquisition must be atomic: either all requested seats are locked or none are (to prevent partial bookings). If any seat is already locked or booked, the entire request fails. Expired locks are lazily cleaned up: check the expiry timestamp when another user tries to lock the seat.`
      },
      {
        question: 'What happens if payment fails after seats are locked?',
        answer: `Implement the Saga pattern with compensation. The booking flow is: (1) lock seats, (2) charge payment, (3) confirm booking. If step 2 fails, the compensation action releases the seat locks immediately so other users can book them. If step 3 fails after payment succeeds, initiate a payment refund and release locks.

Additionally, every lock has a TTL. If the user abandons the flow entirely (closes the browser), the locks expire automatically after the timeout. A background cleanup job periodically scans for expired locks and releases them. The system should also handle idempotency: if a user retries payment, the second attempt should detect the existing lock and proceed rather than creating a duplicate.`
      },
      {
        question: 'How do you handle high-demand shows where thousands of users compete for seats?',
        answer: `For extremely popular shows (e.g., opening night of a blockbuster), use a virtual waiting room. When demand exceeds a threshold, incoming users are placed in a queue and admitted in batches. This prevents the system from being overwhelmed and gives each admitted user a fair window to complete their booking.

At the infrastructure level, cache show and seat data aggressively (seat availability changes are pushed via WebSocket). Use Redis for seat locks instead of the database to handle the lock/unlock throughput. Partition the seat locking by screen to reduce lock contention. Pre-compute the seat layout and pricing so the selection page loads instantly. Rate-limit the booking API per user to prevent bots from hoarding seats.`
      }
    ],

    tips: [
      'Use temporary seat locks with TTL rather than immediate booking to give users time to pay',
      'Make the lock acquisition atomic: all seats or none, preventing partial holds',
      'Implement the Saga pattern for the multi-step booking flow with compensation on failure',
      'Cache seat availability and push updates via WebSocket for real-time seat maps',
      'Design cancellation policies as configurable rules based on time-to-showtime'
    ]
  },
  {
    id: 'amazon-shopping-lld',
    title: 'Amazon Shopping System',
    subtitle: 'E-Commerce Platform Design',
    icon: 'shoppingCart',
    color: '#f97316',
    difficulty: 'Hard',
    description: 'Design an e-commerce system like Amazon with cart, product catalog, inventory management, orders, shipping, recommendations, and reviews.',

    introduction: `An e-commerce platform like Amazon is one of the most comprehensive OOD problems, touching nearly every design pattern and architectural concern. The system manages a massive product catalog with search and filtering, shopping carts with real-time price updates, inventory tracking across multiple warehouses, order processing with payment and fulfillment, shipping logistics, a recommendation engine, and a user review system.

The design must handle eventual consistency (inventory counts across warehouses), high read throughput (millions of product page views), write contention (popular items with limited stock), and complex business logic (pricing rules, promotions, tax calculation, shipping cost estimation). The key is decomposing the monolith into cohesive services with clear responsibilities.`,

    coreEntities: [
      { name: 'Product', description: 'Item in the catalog with title, description, images, price, category, and attributes (size, color, weight)' },
      { name: 'Seller', description: 'Merchant listing products with seller rating, shipping policies, and return policies' },
      { name: 'Inventory', description: 'Stock levels per product per warehouse, with reserved quantity tracking for in-progress orders' },
      { name: 'Cart', description: 'User shopping cart with items, quantities, applied coupons, and computed totals' },
      { name: 'Order', description: 'Placed order with items, shipping address, payment, status lifecycle, and tracking info' },
      { name: 'Review', description: 'User review with rating (1-5), text, verified purchase flag, helpfulness votes, and images' },
      { name: 'ShippingService', description: 'Calculates shipping options/costs, generates labels, and tracks delivery status' },
      { name: 'RecommendationEngine', description: 'Suggests products based on browsing history, purchase history, and collaborative filtering' }
    ],

    designPatterns: [
      'Repository Pattern: Data access layer for products, orders, users with caching and database abstraction',
      'Observer Pattern: Inventory changes trigger cart price updates, low-stock alerts, and recommendation retraining',
      'Strategy Pattern: Shipping cost calculation (weight-based, distance-based, flat rate, free tier), tax calculation by jurisdiction',
      'State Pattern: Order lifecycle (placed -> confirmed -> shipped -> delivered -> returned) with allowed transitions',
      'Decorator Pattern: Price modifiers stacked on base price (coupon, loyalty discount, bulk discount, tax)',
      'Command Pattern: Cart operations (add, remove, update quantity) as undoable commands for cart history'
    ],

    implementation: `from enum import Enum
from datetime import datetime
from typing import Optional
import uuid

class OrderStatus(Enum):
    PLACED = "placed"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELED = "canceled"
    RETURNED = "returned"

class Product:
    def __init__(self, name: str, description: str, price: float,
                 category: str, seller_id: str, weight_kg: float = 0.5):
        self.id = str(uuid.uuid4())
        self.name = name
        self.description = description
        self.price = price
        self.category = category
        self.seller_id = seller_id
        self.weight_kg = weight_kg
        self.average_rating = 0.0
        self.review_count = 0

class InventoryManager:
    def __init__(self):
        self._stock: dict[str, int] = {}        # product_id -> available
        self._reserved: dict[str, int] = {}      # product_id -> reserved for pending orders
        self._lock = __import__('threading').Lock()

    def add_stock(self, product_id: str, quantity: int):
        with self._lock:
            self._stock[product_id] = self._stock.get(product_id, 0) + quantity

    def reserve(self, product_id: str, quantity: int) -> bool:
        with self._lock:
            available = self._stock.get(product_id, 0) - self._reserved.get(product_id, 0)
            if available < quantity:
                return False
            self._reserved[product_id] = self._reserved.get(product_id, 0) + quantity
            return True

    def confirm_reservation(self, product_id: str, quantity: int):
        with self._lock:
            self._stock[product_id] -= quantity
            self._reserved[product_id] -= quantity

    def release_reservation(self, product_id: str, quantity: int):
        with self._lock:
            self._reserved[product_id] = max(0, self._reserved.get(product_id, 0) - quantity)

    def available_quantity(self, product_id: str) -> int:
        return self._stock.get(product_id, 0) - self._reserved.get(product_id, 0)

class CartItem:
    def __init__(self, product: Product, quantity: int):
        self.product = product
        self.quantity = quantity

    @property
    def subtotal(self) -> float:
        return self.product.price * self.quantity

class Cart:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.items: dict[str, CartItem] = {}  # product_id -> CartItem
        self.coupon_code: Optional[str] = None
        self.coupon_discount: float = 0.0

    def add_item(self, product: Product, quantity: int = 1):
        if product.id in self.items:
            self.items[product.id].quantity += quantity
        else:
            self.items[product.id] = CartItem(product, quantity)

    def remove_item(self, product_id: str):
        self.items.pop(product_id, None)

    def update_quantity(self, product_id: str, quantity: int):
        if quantity <= 0:
            self.remove_item(product_id)
        elif product_id in self.items:
            self.items[product_id].quantity = quantity

    def apply_coupon(self, code: str, discount_pct: float):
        self.coupon_code = code
        self.coupon_discount = discount_pct

    @property
    def subtotal(self) -> float:
        return sum(item.subtotal for item in self.items.values())

    @property
    def total(self) -> float:
        discount = self.subtotal * (self.coupon_discount / 100)
        return round(self.subtotal - discount, 2)

class OrderItem:
    def __init__(self, product_id: str, name: str, price: float, quantity: int):
        self.product_id = product_id
        self.name = name
        self.price_at_purchase = price
        self.quantity = quantity

class Order:
    def __init__(self, user_id: str, items: list[OrderItem],
                 shipping_address: str, total: float):
        self.id = str(uuid.uuid4())
        self.user_id = user_id
        self.items = items
        self.shipping_address = shipping_address
        self.total = total
        self.status = OrderStatus.PLACED
        self.tracking_number: Optional[str] = None
        self.created_at = datetime.now()

    def transition_to(self, new_status: OrderStatus):
        valid = {
            OrderStatus.PLACED: [OrderStatus.CONFIRMED, OrderStatus.CANCELED],
            OrderStatus.CONFIRMED: [OrderStatus.PROCESSING, OrderStatus.CANCELED],
            OrderStatus.PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELED],
            OrderStatus.SHIPPED: [OrderStatus.DELIVERED],
            OrderStatus.DELIVERED: [OrderStatus.RETURNED],
        }
        if new_status not in valid.get(self.status, []):
            raise ValueError(f"Cannot transition from {self.status} to {new_status}")
        self.status = new_status

class Review:
    def __init__(self, user_id: str, product_id: str, rating: int,
                 text: str, verified_purchase: bool = False):
        self.id = str(uuid.uuid4())
        self.user_id = user_id
        self.product_id = product_id
        self.rating = max(1, min(5, rating))
        self.text = text
        self.verified_purchase = verified_purchase
        self.helpful_votes = 0
        self.created_at = datetime.now()

class RecommendationEngine:
    def __init__(self):
        self.purchase_history: dict[str, list[str]] = {}  # user -> [product_ids]
        self.product_categories: dict[str, str] = {}      # product_id -> category

    def record_purchase(self, user_id: str, product_id: str, category: str):
        self.purchase_history.setdefault(user_id, []).append(product_id)
        self.product_categories[product_id] = category

    def get_recommendations(self, user_id: str, catalog: list[Product],
                            limit: int = 10) -> list[Product]:
        purchased = set(self.purchase_history.get(user_id, []))
        # Category affinity: recommend from categories user buys most
        cat_counts: dict[str, int] = {}
        for pid in purchased:
            cat = self.product_categories.get(pid, "")
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
        top_cats = sorted(cat_counts, key=cat_counts.get, reverse=True)[:3]

        recs = [p for p in catalog
                if p.id not in purchased and p.category in top_cats]
        recs.sort(key=lambda p: p.average_rating, reverse=True)
        return recs[:limit]

class OrderService:
    def __init__(self, inventory: InventoryManager):
        self.inventory = inventory
        self.orders: dict[str, Order] = {}

    def place_order(self, cart: Cart, shipping_address: str) -> Order:
        # Reserve inventory for all items
        reserved = []
        for item in cart.items.values():
            if not self.inventory.reserve(item.product.id, item.quantity):
                # Rollback previous reservations
                for pid, qty in reserved:
                    self.inventory.release_reservation(pid, qty)
                raise ValueError(f"Insufficient stock for {item.product.name}")
            reserved.append((item.product.id, item.quantity))

        order_items = [
            OrderItem(item.product.id, item.product.name,
                      item.product.price, item.quantity)
            for item in cart.items.values()
        ]
        order = Order(cart.user_id, order_items, shipping_address, cart.total)
        self.orders[order.id] = order

        # Confirm inventory deduction
        for pid, qty in reserved:
            self.inventory.confirm_reservation(pid, qty)
        order.transition_to(OrderStatus.CONFIRMED)
        cart.items.clear()
        return order

    def cancel_order(self, order_id: str):
        order = self.orders[order_id]
        order.transition_to(OrderStatus.CANCELED)
        for item in order.items:
            self.inventory.add_stock(item.product_id, item.quantity)`,

    keyQuestions: [
      {
        question: 'How do you handle inventory for high-demand products with limited stock?',
        answer: `Use a reserve-then-confirm pattern. When a user adds items to their cart and proceeds to checkout, reserve the inventory (decrement available count without actually removing stock). If payment succeeds, confirm the reservation (permanently deduct stock). If payment fails or the reservation expires, release it back.

For flash sales with extreme contention, use Redis atomic decrements (DECRBY) for the available count. If the result is negative, the item is sold out and the operation is rejected. This avoids database row-level lock contention. Additionally, implement a queue-based checkout for viral products: users join a virtual queue and are admitted in order, preventing thundering herd problems on the inventory service.`
      },
      {
        question: 'How would you design the recommendation engine?',
        answer: `Start with three complementary strategies. (1) Collaborative filtering: "Users who bought X also bought Y." Build a user-item interaction matrix and find similar users (user-based) or similar items (item-based) using cosine similarity. (2) Content-based filtering: recommend products with similar attributes (category, brand, price range) to what the user has browsed or purchased. (3) Popularity-based: recommend trending items in the user's preferred categories.

Combine these strategies with a scoring function that weights recency, relevance, and diversity. Cache recommendations per user and invalidate on new purchases. For cold-start users (new accounts), rely on popularity and trending items. Pre-compute recommendations in batch (hourly) for most users, and compute on-the-fly only for very active users whose behavior has changed significantly since the last batch.`
      },
      {
        question: 'How do you ensure the order total is accurate when prices can change?',
        answer: `Snapshot the price at the moment of purchase. The OrderItem stores price_at_purchase rather than referencing the current product price. This ensures the order total is immutable once placed, even if the seller changes the price afterward.

During checkout, re-validate prices against the current catalog (in case the price changed while the item sat in the cart). If the price increased, notify the user and ask for confirmation. If the price decreased, apply the lower price automatically. The cart total is always computed dynamically from current prices, but the order total is frozen at checkout time. This separation between cart (dynamic) and order (static) pricing is crucial for accurate billing and dispute resolution.`
      }
    ],

    tips: [
      'Separate cart pricing (dynamic, always current) from order pricing (frozen at purchase time)',
      'Use the reserve-then-confirm pattern for inventory to handle concurrent checkout without overselling',
      'Model order status as a state machine with explicit valid transitions',
      'Store review ratings denormalized on the product (average_rating, review_count) for fast reads',
      'Design recommendations as a pluggable strategy so you can A/B test different algorithms'
    ]
  },
];

export const extraLldProblemCategoryMap = {
  'bloom-filter': 'data-structures',
  'search-autocomplete': 'data-structures',
  'traffic-control': 'systems',
  'coffee-vending': 'systems',
  'inventory-management': 'systems',
  'restaurant-management': 'systems',
  'social-network': 'systems',
  'learning-platform': 'systems',
  'cricinfo': 'systems',
  'linkedin-lld': 'systems',
  'spotify-lld': 'systems',
  'notification-system-lld': 'systems',
  'pub-sub': 'systems',
  'chat-application': 'systems',
  'payment-gateway-lld': 'systems',
  'food-delivery': 'systems',
  'ride-hailing': 'systems',
  'amazon-locker': 'utilities',
  'shopping-cart': 'utilities',
  'car-rental': 'systems',
  'meeting-scheduler': 'systems',
  'url-shortener-lld': 'utilities',
  'rate-limiter-lld': 'utilities',
  'in-memory-filesystem': 'systems',
  'version-control': 'systems',
  'airline-management': 'systems',
  'online-stock-brokerage': 'systems',
  'hotel-management-lld': 'systems',
  'blackjack-card-game': 'games',
  'movie-ticket-booking': 'systems',
  'amazon-shopping-lld': 'systems',
};
