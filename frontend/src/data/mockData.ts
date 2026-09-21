import { Flashcard, NoteItem, QuizQuestion, UserProfile } from '../types';

export const INITIAL_USER: UserProfile = {
  name: 'Scholar',
  role: 'Scholar',
  grade: 'Academic Scholar',
  avatarInitials: 'AS',
  streakDays: 1,
  totalXp: 0,
  dailyGoalMinutes: 45,
  dailySpentMinutes: 0,
  retentionIndex: 90,
};

export const SUBJECTS = [
  'Computer Networks: Transport Layer Protocol Suite',
  'AP Computer Science A: Algorithms & Data Structures',
  'AP Physics C: Electricity, Magnetism & Circuits',
  'AP Calculus BC: Series & Taylor Approximations',
];

export const INITIAL_FLASHCARDS: Flashcard[] = [
  {
    id: 'fc-1',
    category: 'RFC 793 Protocol',
    question: 'Why must a TCP socket remain in TIME-WAIT state for 2MSL after sending the final ACK?',
    answer: '1. Ensures late duplicate segments from the previous connection die in wandering router buffers before a new connection reuses the (IP, Port) quadruplet.\n2. Allows retransmission of the final ACK if the remote server retransmits its FIN packet.',
    colorTheme: 'sky',
    intervalDays: 3,
  },
  {
    id: 'fc-2',
    category: 'SYN Flood Defense',
    question: 'How do SYN Cookies mitigate TCP SYN Flooding attacks without storing half-open states?',
    answer: 'The server encodes client IP, port, timestamp, and MSS into the initial sequence number (ISN). When the client ACKs with ISN+1, the server verifies the cryptographic hash without reserving TCB memory until handshake completion.',
    colorTheme: 'rose',
    intervalDays: 1,
  },
  {
    id: 'fc-3',
    category: 'Flow vs Congestion',
    question: 'What is the mathematical difference between Receiver Window (rwnd) and Congestion Window (cwnd)?',
    answer: 'rwnd is advertised explicitly by the receiver to prevent buffer overflow. cwnd is calculated dynamically by sender algorithms (Tahoe/Reno/CUBIC) based on network congestion. Effective Window = min(rwnd, cwnd).',
    colorTheme: 'cream',
    intervalDays: 5,
  },
  {
    id: 'fc-4',
    category: 'UDP Architecture',
    question: 'Why does UDP use a 16-bit one\'s complement pseudo-header checksum?',
    answer: 'The pseudo-header includes IP source/destination addresses to detect packets misrouted to the wrong host or interface, even though IP and UDP live at distinct OSI layers.',
    colorTheme: 'navy',
    intervalDays: 2,
  }
];

export const INITIAL_NOTES: NoteItem[] = [
  {
    id: 'note-1',
    title: 'FIN-WAIT-2 vs TIME-WAIT',
    content: 'Client enters TIME-WAIT only after it receives FIN from server and returns ACK. In FIN-WAIT-2, it is still awaiting the server\'s FIN signal.',
    color: 'sky',
    timestamp: 'Today at 10:44 AM',
    tags: ['TCP', 'State Machine', 'RFC 793'],
  },
  {
    id: 'note-2',
    title: 'RST Hazard & Ephemeral Port Collisions',
    content: 'Closing socket early causes incoming late packets to trigger connection resets (RST), potentially crashing or desynchronizing downstream consumers.',
    color: 'pink',
    timestamp: 'Today at 10:45 AM',
    tags: ['Security', 'Kernel', 'Sockets'],
  },
  {
    id: 'note-3',
    title: 'Tahoe vs Reno Fast Recovery',
    content: 'Tahoe drops cwnd back to 1 MSS on 3 dup ACKs. Reno cuts cwnd in half (ssthresh = cwnd/2) and enters Fast Recovery directly without slow start.',
    color: 'cream',
    timestamp: 'Yesterday at 4:15 PM',
    tags: ['Congestion Control', 'Exams'],
  }
];

export interface QuizTrack {
  id: string;
  title: string;
  category: string;
  description: string;
  badge: string;
  questions: QuizQuestion[];
}

export const QUIZ_TRACKS: QuizTrack[] = [
  {
    id: 'track-tcp',
    title: 'RFC 793: TCP State Machine & 4-Way Teardown',
    category: 'Computer Networks',
    description: 'Verify state transitions, sequence math, and socket teardown guarantees.',
    badge: 'Core RFC',
    questions: [
      {
        id: 'tcp-1',
        question: 'If an operating system standard RFC specifies MSL as 2 minutes, what is the exact duration of the socket\'s TIME-WAIT state?',
        options: [
          { label: 'A', text: '60 seconds (1 minute)' },
          { label: 'B', text: '2 minutes (1 MSL)' },
          { label: 'C', text: '4 minutes (2 x MSL)' },
          { label: 'D', text: 'Indefinite until kernel garbage collection' },
        ],
        correctAnswer: 'C',
        explanation: 'TIME-WAIT duration is strictly defined as 2 * MSL. 2 * 2 minutes = 4 minutes (240 seconds). Linux systems often configure this to 60s, but RFC 793 standard is 2 * MSL.',
        xpReward: 25,
      },
      {
        id: 'tcp-2',
        question: 'What triggers TCP Fast Retransmit before the retransmission timeout (RTO) timer expires?',
        options: [
          { label: 'A', text: 'A single NACK packet from receiver' },
          { label: 'B', text: 'Receipt of 3 duplicate ACKs for the same sequence' },
          { label: 'C', text: 'ICMP Destination Unreachable message' },
          { label: 'D', text: 'Sender Congestion Window exceeding Receiver Window' },
        ],
        correctAnswer: 'B',
        explanation: 'When 3 duplicate ACKs arrive, TCP deduces an isolated segment was dropped and immediately retransmits without waiting for the slow timer to expire.',
        xpReward: 25,
      },
      {
        id: 'tcp-3',
        question: 'Which TCP flag combination is sent by the server in response to a client\'s initial SYN packet?',
        options: [
          { label: 'A', text: 'ACK only with Seq = 0' },
          { label: 'B', text: 'SYN + ACK with server ISN and client ISN+1' },
          { label: 'C', text: 'RST + ACK to verify legitimacy' },
          { label: 'D', text: 'FIN + SYN to establish half-duplex channel' },
        ],
        correctAnswer: 'B',
        explanation: 'The server synchronizes its own sequence number while acknowledging the client\'s sequence number via SYN + ACK.',
        xpReward: 25,
      },
      {
        id: 'tcp-4',
        question: 'In TCP connection termination, which state does the active closer enter immediately after sending its FIN segment?',
        options: [
          { label: 'A', text: 'CLOSE-WAIT' },
          { label: 'B', text: 'FIN-WAIT-1' },
          { label: 'C', text: 'TIME-WAIT' },
          { label: 'D', text: 'LAST-ACK' },
        ],
        correctAnswer: 'B',
        explanation: 'The endpoint that initiates active close sends FIN and transitions from ESTABLISHED into FIN-WAIT-1, awaiting ACK from peer.',
        xpReward: 25,
      }
    ]
  },
  {
    id: 'track-congestion',
    title: 'TCP Congestion Control: Tahoe, Reno & CUBIC',
    category: 'Algorithmic Protocols',
    description: 'Analyze Additive Increase / Multiplicative Decrease (AIMD) and slow-start curves.',
    badge: 'Algorithms',
    questions: [
      {
        id: 'cc-1',
        question: 'During TCP Slow Start, how does the Congestion Window (cwnd) grow for each received ACK?',
        options: [
          { label: 'A', text: 'Increases linearly by 1 MSS every Round Trip Time (RTT)' },
          { label: 'B', text: 'Increases by 1 MSS per incoming ACK, effectively doubling cwnd each RTT' },
          { label: 'C', text: 'Remains fixed until slow-start threshold (ssthresh) is reached' },
          { label: 'D', text: 'Scales cubically based on elapsed wall-clock time' },
        ],
        correctAnswer: 'B',
        explanation: 'Slow Start doubles cwnd every RTT because for each segment ACKed, cwnd increases by 1 MSS, resulting in exponential growth.',
        xpReward: 25,
      },
      {
        id: 'cc-2',
        question: 'What is the primary difference between TCP Tahoe and TCP Reno when 3 duplicate ACKs are observed?',
        options: [
          { label: 'A', text: 'Tahoe resets cwnd to 1 MSS; Reno halves cwnd and initiates Fast Recovery' },
          { label: 'B', text: 'Tahoe doubles ssthresh; Reno divides ssthresh by 4' },
          { label: 'C', text: 'Tahoe uses ECN bits; Reno uses selective acknowledgments only' },
          { label: 'D', text: 'Both protocols reset cwnd to 1 MSS regardless of packet loss type' },
        ],
        correctAnswer: 'A',
        explanation: 'Tahoe treats 3 dup ACKs the same as a timeout (drops cwnd to 1 MSS). Reno recognizes packets are still circulating, sets ssthresh = cwnd / 2, sets cwnd = ssthresh + 3, and fast recovers.',
        xpReward: 25,
      },
      {
        id: 'cc-3',
        question: 'What mathematical function does Linux default congestion control algorithm (CUBIC) use for window growth?',
        options: [
          { label: 'A', text: 'Linear function of RTT: cwnd(t) = m * t + b' },
          { label: 'B', text: 'Exponential function: cwnd(t) = 2^t' },
          { label: 'C', text: 'Cubic polynomial function of time elapsed since last congestion event' },
          { label: 'D', text: 'Logarithmic decay curve: cwnd(t) = ln(t)' },
        ],
        correctAnswer: 'C',
        explanation: 'CUBIC uses a cubic function W(t) = C(t - K)^3 + W_max, which is independent of RTT, making it fair to connections with high delay (BDP).',
        xpReward: 25,
      }
    ]
  },
  {
    id: 'track-dsa',
    title: 'Data Structures: Hash Tables & Balanced Trees',
    category: 'Computer Science',
    description: 'Explore collision resolution, tree rotations, and asymptotic complexity.',
    badge: 'AP CS / DSA',
    questions: [
      {
        id: 'dsa-1',
        question: 'What is the worst-case lookup time complexity in a standard Binary Search Tree without rebalancing?',
        options: [
          { label: 'A', text: 'O(1)' },
          { label: 'B', text: 'O(log N)' },
          { label: 'C', text: 'O(N) when elements are inserted in monotonic sorted order' },
          { label: 'D', text: 'O(N log N)' },
        ],
        correctAnswer: 'C',
        explanation: 'Without balancing (such as AVL or Red-Black rotations), inserting sorted values produces a degenerate linked-list tree with O(N) traversal depth.',
        xpReward: 25,
      },
      {
        id: 'dsa-2',
        question: 'What occurs during Open Addressing with Linear Probing when many consecutive table slots become occupied?',
        options: [
          { label: 'A', text: 'Primary Clustering, where probe sequences lengthen drastically' },
          { label: 'B', text: 'Secondary Hash Collision' },
          { label: 'C', text: 'Automatic rehashing to size 2N + 1' },
          { label: 'D', text: 'Zero overhead due to continuous cache locality' },
        ],
        correctAnswer: 'A',
        explanation: 'Linear probing suffers from Primary Clustering: as clusters grow, any hash key landing in or near a cluster extends it further.',
        xpReward: 25,
      },
      {
        id: 'dsa-3',
        question: 'In a Red-Black tree, what is the maximum possible height difference between any two leaf nodes?',
        options: [
          { label: 'A', text: 'At most 1 (strictly balanced)' },
          { label: 'B', text: 'The longest path is at most twice the length of the shortest path' },
          { label: 'C', text: 'At most log2(N)' },
          { label: 'D', text: 'Arbitrary height permitted as long as root is black' },
        ],
        correctAnswer: 'B',
        explanation: 'Because every path from root to leaf has identical black-height and no two red nodes can be adjacent, the longest path (alternating red-black) is at most 2x the shortest (all black).',
        xpReward: 25,
      }
    ]
  }
];

export const INITIAL_QUIZ: QuizQuestion[] = QUIZ_TRACKS[0].questions;
