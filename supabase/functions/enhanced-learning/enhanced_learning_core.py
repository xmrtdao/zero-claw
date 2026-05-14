#!/usr/bin/env python3
"""
Enhanced Autonomous Learning System for XMRT-Ecosystem
Advanced ML algorithms, neural networks, and predictive modeling
"""

import numpy as np
import json
import time
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from collections import deque, defaultdict
from abc import ABC, abstractmethod

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class LearningExperience:
    """Individual learning experience record"""
    timestamp: str
    context: Dict[str, Any]
    action_taken: str
    outcome: Dict[str, Any]
    reward: float
    confidence: float = 0.5
    metadata: Dict[str, Any] = field(default_factory=dict)

class OptimizationAlgorithm(ABC):
    """Abstract base class for optimization algorithms"""

    @abstractmethod
    def update(self, current_state: Dict[str, Any], feedback: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_next_parameters(self) -> Dict[str, Any]:
        pass

class AdaptiveGradientDescent(OptimizationAlgorithm):
    """Advanced gradient descent with adaptive learning rates"""

    def __init__(self, learning_rate: float = 0.01, momentum: float = 0.9, 
                 adaptive_factor: float = 1.1, decay_factor: float = 0.95):
        self.learning_rate = learning_rate
        self.base_learning_rate = learning_rate
        self.momentum = momentum
        self.adaptive_factor = adaptive_factor
        self.decay_factor = decay_factor
        self.velocity = {}
        self.performance_history = deque(maxlen=50)

    def update(self, current_state: Dict[str, Any], feedback: Dict[str, Any]) -> Dict[str, Any]:
        performance = feedback.get('performance', 0.0)
        gradients = feedback.get('gradients', {})

        self.performance_history.append(performance)
        if len(self.performance_history) >= 2:
            if self.performance_history[-1] > self.performance_history[-2]:
                self.learning_rate = min(self.learning_rate * self.adaptive_factor, 
                                       self.base_learning_rate * 2.0)
            else:
                self.learning_rate *= self.decay_factor

        for param_name, gradient in gradients.items():
            if param_name not in self.velocity:
                self.velocity[param_name] = 0
            self.velocity[param_name] = (self.momentum * self.velocity[param_name] + 
                                       self.learning_rate * gradient)

        return {
            'learning_rate': self.learning_rate,
            'velocity': dict(self.velocity),
            'momentum': self.momentum
        }

    def get_next_parameters(self) -> Dict[str, Any]:
        return {
            'learning_rate': self.learning_rate,
            'update_rule': 'momentum_gradient_descent',
            'velocity': dict(self.velocity)
        }

class BayesianOptimizer(OptimizationAlgorithm):
    """Bayesian optimization for hyperparameter tuning"""

    def __init__(self, parameter_space: Dict[str, Tuple[float, float]]):
        self.parameter_space = parameter_space
        self.observations = []
        self.parameter_history = []
        self.best_params = None
        self.best_score = float('-inf')

    def update(self, current_state: Dict[str, Any], feedback: Dict[str, Any]) -> Dict[str, Any]:
        parameters = current_state.get('parameters', {})
        performance = feedback.get('performance', 0.0)

        self.observations.append(performance)
        self.parameter_history.append(parameters.copy())

        if performance > self.best_score:
            self.best_score = performance
            self.best_params = parameters.copy()

        return {
            'best_score': self.best_score,
            'best_params': self.best_params,
            'observations_count': len(self.observations)
        }

    def get_next_parameters(self) -> Dict[str, Any]:
        if len(self.observations) < 3:
            return self._random_sample()
        return self._ucb_acquisition()

    def _random_sample(self) -> Dict[str, Any]:
        params = {}
        for param_name, (min_val, max_val) in self.parameter_space.items():
            params[param_name] = float(np.random.uniform(min_val, max_val))
        return params

    def _ucb_acquisition(self) -> Dict[str, Any]:
        best_params = self.best_params.copy() if self.best_params else self._random_sample()
        
        for param_name in best_params:
            min_val, max_val = self.parameter_space[param_name]
            noise_scale = (max_val - min_val) * 0.1
            best_params[param_name] += np.random.normal(0, noise_scale)
            best_params[param_name] = float(np.clip(best_params[param_name], min_val, max_val))

        return best_params

class ReinforcementLearningAgent:
    """Q-learning based reinforcement learning agent"""

    def __init__(self, state_space_size: int = 1000, action_space_size: int = 10,
                 learning_rate: float = 0.1, discount_factor: float = 0.95,
                 epsilon: float = 0.1, epsilon_decay: float = 0.995):
        self.state_space_size = state_space_size
        self.action_space_size = action_space_size
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.epsilon = epsilon
        self.epsilon_decay = epsilon_decay
        self.q_table = np.zeros((state_space_size, action_space_size))
        self.experience_buffer = deque(maxlen=10000)

    def get_state_hash(self, state: Dict[str, Any]) -> int:
        state_str = str(sorted(state.items()))
        return hash(state_str) % self.state_space_size

    def select_action(self, state: Dict[str, Any]) -> int:
        state_hash = self.get_state_hash(state)
        if np.random.random() < self.epsilon:
            return int(np.random.randint(0, self.action_space_size))
        else:
            return int(np.argmax(self.q_table[state_hash]))

    def update_q_value(self, state: Dict[str, Any], action: int, reward: float,
                      next_state: Dict[str, Any], done: bool):
        state_hash = self.get_state_hash(state)
        next_state_hash = self.get_state_hash(next_state)

        if done:
            target = reward
        else:
            target = reward + self.discount_factor * np.max(self.q_table[next_state_hash])

        current_q = self.q_table[state_hash, action]
        self.q_table[state_hash, action] += self.learning_rate * (target - current_q)

        self.epsilon = max(0.01, self.epsilon * self.epsilon_decay)

    def get_policy_strength(self) -> float:
        q_variance = float(np.var(self.q_table))
        max_q = float(np.max(self.q_table))
        if max_q == 0:
            return 0.0
        return min(1.0, q_variance / max_q)

class EnhancedAutonomousLearningCore:
    """Enhanced autonomous learning system with advanced algorithms"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}

        self.gradient_optimizer = AdaptiveGradientDescent(
            learning_rate=self.config.get('learning_rate', 0.01)
        )

        parameter_space = {
            'learning_rate': (0.001, 0.1),
            'confidence_threshold': (0.5, 0.95)
        }
        self.bayesian_optimizer = BayesianOptimizer(parameter_space)
        self.rl_agent = ReinforcementLearningAgent()

        self.learning_experiences = deque(maxlen=10000)
        self.performance_metrics = defaultdict(list)
        
        self.current_optimizer = 'gradient'
        self.learning_iteration = 0
        self.last_performance = 0.0

        logger.info("Enhanced Autonomous Learning Core initialized")

    def learn_from_experience(self, experience_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process and learn from a new experience"""
        try:
            experience = LearningExperience(
                timestamp=experience_data.get('timestamp', datetime.now().isoformat()),
                context=experience_data.get('context', {}),
                action_taken=experience_data.get('action_taken', ''),
                outcome=experience_data.get('outcome', {}),
                reward=experience_data.get('reward', 0.0),
                confidence=experience_data.get('confidence', 0.5)
            )
            
            self.learning_experiences.append(experience)

            self._update_performance_metrics(experience)
            learning_result = self._apply_learning_updates(experience)
            self._update_rl_agent(experience)

            result = {
                'learning_iteration': self.learning_iteration,
                'performance_improvement': learning_result.get('performance_improvement', 0.0),
                'current_optimizer': self.current_optimizer,
                'rl_policy_strength': self.rl_agent.get_policy_strength(),
                'confidence': experience.confidence,
                'timestamp': experience.timestamp
            }

            self.learning_iteration += 1
            return result

        except Exception as e:
            logger.error(f"Learning from experience failed: {e}")
            return {'error': str(e), 'success': False}

    def _update_performance_metrics(self, experience: LearningExperience):
        performance = experience.outcome.get('performance', 0.0)
        self.performance_metrics['overall'].append({
            'value': performance,
            'timestamp': experience.timestamp
        })

    def _apply_learning_updates(self, experience: LearningExperience) -> Dict[str, Any]:
        current_state = {
            'parameters': experience.context.get('parameters', {}),
            'performance': experience.outcome.get('performance', 0.0)
        }

        feedback = {
            'performance': experience.outcome.get('performance', 0.0),
            'reward': experience.reward,
            'gradients': experience.outcome.get('gradients', {}),
            'confidence': experience.confidence
        }

        if self.current_optimizer == 'gradient':
            update_result = self.gradient_optimizer.update(current_state, feedback)
        elif self.current_optimizer == 'bayesian':
            update_result = self.bayesian_optimizer.update(current_state, feedback)
        else:
            update_result = {}

        current_performance = feedback['performance']
        performance_improvement = current_performance - self.last_performance
        self.last_performance = current_performance

        update_result['performance_improvement'] = performance_improvement
        return update_result

    def _update_rl_agent(self, experience: LearningExperience):
        try:
            state = experience.context
            action = hash(experience.action_taken) % self.rl_agent.action_space_size
            reward = experience.reward
            next_state = experience.outcome.get('next_state', {})
            done = experience.outcome.get('episode_done', False)

            self.rl_agent.update_q_value(state, action, reward, next_state, done)
        except Exception as e:
            logger.error(f"RL agent update failed: {e}")

    def get_learning_analytics(self) -> Dict[str, Any]:
        recent_experiences = list(self.learning_experiences)[-100:]
        
        performance_values = [exp.outcome.get('performance', 0.0) for exp in recent_experiences]
        confidence_values = [exp.confidence for exp in recent_experiences]

        return {
            'total_experiences': len(self.learning_experiences),
            'learning_iteration': self.learning_iteration,
            'current_optimizer': self.current_optimizer,
            'performance_trend': {
                'mean': float(np.mean(performance_values)) if performance_values else 0.0,
                'std': float(np.std(performance_values)) if performance_values else 0.0,
                'min': float(np.min(performance_values)) if performance_values else 0.0,
                'max': float(np.max(performance_values)) if performance_values else 0.0
            },
            'confidence_trend': {
                'mean': float(np.mean(confidence_values)) if confidence_values else 0.0,
                'std': float(np.std(confidence_values)) if confidence_values else 0.0
            },
            'rl_agent_stats': {
                'policy_strength': self.rl_agent.get_policy_strength(),
                'epsilon': self.rl_agent.epsilon
            }
        }

# Global instance
_learning_core = None

def get_learning_core(config: Optional[Dict[str, Any]] = None):
    global _learning_core
    if _learning_core is None:
        _learning_core = EnhancedAutonomousLearningCore(config)
    return _learning_core

def process_learning_request(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Main entry point for learning requests"""
    action = request_data.get('action', 'learn')
    config = request_data.get('config', {})
    
    core = get_learning_core(config)
    
    if action == 'learn':
        experience_data = request_data.get('experience', {})
        return core.learn_from_experience(experience_data)
    elif action == 'analytics':
        return core.get_learning_analytics()
    else:
        return {'error': 'Unknown action', 'success': False}
