from copy import deepcopy


class RiskAnswerValidationError(Exception):
    def __init__(self, errors):
        super().__init__('Invalid risk answers')
        self.errors = errors


QUESTION_SCHEMA_VERSION = 2

BASE_SCORES = {
    'TERRORISM': 35,
    'BANDITRY': 28,
    'KIDNAPPING': 30,
    'ARMED_ROBBERY': 20,
    'ROBBERY': 14,
    'FIRE_INCIDENCE': 16,
    'ACCIDENT': 15,
    'OTHER': 10,
}

# Score thresholds when no hard critical override was triggered.
SCORE_THRESHOLDS = (
    ('CRITICAL', 120),
    ('HIGH', 80),
    ('MEDIUM', 40),
    ('LOW', 0),
)


QUESTION_BANK = {
    'FIRE_INCIDENCE': [
        {
            'id': 'buildings_affected',
            'type': 'single_select',
            'label': 'How many buildings are currently affected?',
            'required': True,
            'options': [
                {'value': 'ONE', 'label': '1', 'score': 8, 'factor': 'single building involved'},
                {'value': 'TWO_TO_THREE', 'label': '2\u20133', 'score': 20, 'factor': 'multiple buildings involved'},
                {'value': 'FOUR_PLUS', 'label': '4 or more', 'score': 40, 'factor': 'large structural spread', 'critical': True},
            ],
        },
        {
            'id': 'people_trapped',
            'type': 'boolean',
            'label': 'Are people trapped inside?',
            'required': True,
            'true_score': 50,
            'factor_true': 'people trapped in fire zone',
            'critical_if_true': True,
        },
        {
            'id': 'spread_rate',
            'type': 'single_select',
            'label': 'How fast is the fire spreading?',
            'required': True,
            'options': [
                {'value': 'CONTAINED', 'label': 'Contained', 'score': 5, 'factor': 'fire contained'},
                {'value': 'MODERATE', 'label': 'Moderate spread', 'score': 20, 'factor': 'fire spreading'},
                {'value': 'RAPID', 'label': 'Rapid spread', 'score': 40, 'factor': 'rapid spread'},
            ],
        },
        {
            'id': 'hazardous_materials',
            'type': 'boolean',
            'label': 'Is there fuel, gas, or chemical exposure nearby?',
            'required': True,
            'true_score': 45,
            'factor_true': 'hazardous materials present',
            'critical_if_true': True,
        },
        {
            'id': 'injury_severity',
            'type': 'single_select',
            'label': 'Current injury severity at the scene?',
            'required': True,
            'options': [
                {'value': 'NONE', 'label': 'No injuries', 'score': 0},
                {'value': 'MINOR', 'label': 'Minor injuries', 'score': 10, 'factor': 'minor injuries'},
                {'value': 'SERIOUS', 'label': 'Serious injuries', 'score': 30, 'factor': 'serious injuries'},
                {
                    'value': 'CRITICAL_OR_FATAL',
                    'label': 'Critical injuries or fatalities',
                    'score': 70,
                    'factor': 'critical injuries or fatalities',
                    'critical': True,
                },
            ],
        },
    ],
    'TERRORISM': [
        {
            'id': 'active_attack',
            'type': 'boolean',
            'label': 'Is the attack currently active?',
            'required': True,
            'true_score': 55,
            'factor_true': 'active attack in progress',
            'critical_if_true': True,
        },
        {
            'id': 'explosives_or_bombs',
            'type': 'boolean',
            'label': 'Are explosives, bombs, or blasts involved?',
            'required': True,
            'true_score': 55,
            'factor_true': 'explosives reported',
            'critical_if_true': True,
        },
        {
            'id': 'hostages',
            'type': 'boolean',
            'label': 'Are hostages being held?',
            'required': True,
            'true_score': 45,
            'factor_true': 'hostage situation',
            'critical_if_true': True,
        },
        {
            'id': 'people_at_risk',
            'type': 'single_select',
            'label': 'How many people are at immediate risk?',
            'required': True,
            'options': [
                {'value': 'FIVE_OR_FEWER', 'label': '5 or fewer', 'score': 8, 'factor': 'small exposed group'},
                {'value': 'SIX_TO_TWENTY', 'label': '6\u201320', 'score': 22, 'factor': 'moderate exposed group'},
                {'value': 'TWENTY_ONE_TO_HUNDRED', 'label': '21\u2013100', 'score': 35, 'factor': 'large exposed group'},
                {'value': 'HUNDRED_ONE_TO_THOUSAND', 'label': '101\u20131,000', 'score': 42, 'factor': 'very large exposed group'},
                {'value': 'THOUSAND_PLUS', 'label': '1,000+', 'score': 50, 'factor': 'mass exposure'},
            ],
        },
        {
            'id': 'injury_severity',
            'type': 'single_select',
            'label': 'Current injury severity at the scene?',
            'required': True,
            'options': [
                {'value': 'NONE', 'label': 'No injuries', 'score': 0},
                {'value': 'MINOR', 'label': 'Minor injuries', 'score': 12, 'factor': 'minor injuries'},
                {'value': 'SERIOUS', 'label': 'Serious injuries', 'score': 35, 'factor': 'serious injuries'},
                {
                    'value': 'CRITICAL_OR_FATAL',
                    'label': 'Critical injuries or fatalities',
                    'score': 70,
                    'factor': 'critical injuries or fatalities',
                    'critical': True,
                },
            ],
        },
    ],
    'BANDITRY': [
        {
            'id': 'attack_in_progress',
            'type': 'boolean',
            'label': 'Is the attack currently in progress?',
            'required': True,
            'true_score': 45,
            'factor_true': 'active violent attack',
            'critical_if_true': True,
        },
        {
            'id': 'attackers_armed',
            'type': 'boolean',
            'label': 'Are attackers armed with guns or dangerous weapons?',
            'required': True,
            'true_score': 35,
            'factor_true': 'armed attackers reported',
        },
        {
            'id': 'number_of_attackers',
            'type': 'single_select',
            'label': 'Approximate number of attackers?',
            'required': True,
            'options': [
                {'value': 'ONE_OR_TWO', 'label': '1\u20132', 'score': 10, 'factor': 'small attacker group'},
                {'value': 'THREE_TO_FIVE', 'label': '3\u20135', 'score': 24, 'factor': 'organized attacker group'},
                {'value': 'SIX_PLUS', 'label': '6 or more', 'score': 40, 'factor': 'large attacker group'},
            ],
        },
        {
            'id': 'area_lockdown',
            'type': 'boolean',
            'label': 'Is movement blocked (roadblock/area lockdown)?',
            'required': True,
            'true_score': 28,
            'factor_true': 'critical access routes blocked',
        },
        {
            'id': 'injury_severity',
            'type': 'single_select',
            'label': 'Current injury severity at the scene?',
            'required': True,
            'options': [
                {'value': 'NONE', 'label': 'No injuries', 'score': 0},
                {'value': 'MINOR', 'label': 'Minor injuries', 'score': 10, 'factor': 'minor injuries'},
                {'value': 'SERIOUS', 'label': 'Serious injuries', 'score': 30, 'factor': 'serious injuries'},
                {
                    'value': 'CRITICAL_OR_FATAL',
                    'label': 'Critical injuries or fatalities',
                    'score': 65,
                    'factor': 'critical injuries or fatalities',
                    'critical': True,
                },
            ],
        },
    ],
    'KIDNAPPING': [
        {
            'id': 'abduction_in_progress',
            'type': 'boolean',
            'label': 'Is the abduction currently in progress?',
            'required': True,
            'true_score': 50,
            'factor_true': 'abduction in progress',
            'critical_if_true': True,
        },
        {
            'id': 'victims_count',
            'type': 'single_select',
            'label': 'How many victims are involved?',
            'required': True,
            'options': [
                {'value': 'ONE', 'label': '1', 'score': 15, 'factor': 'single victim'},
                {'value': 'TWO_TO_THREE', 'label': '2\u20133', 'score': 32, 'factor': 'multiple victims'},
                {'value': 'FOUR_PLUS', 'label': '4 or more', 'score': 48, 'factor': 'mass abduction', 'critical': True},
            ],
        },
        {
            'id': 'kidnappers_armed',
            'type': 'boolean',
            'label': 'Are kidnappers armed?',
            'required': True,
            'true_score': 35,
            'factor_true': 'armed kidnappers',
        },
        {
            'id': 'victim_vulnerable',
            'type': 'boolean',
            'label': 'Is any victim a child, elderly person, or medically vulnerable?',
            'required': True,
            'true_score': 35,
            'factor_true': 'vulnerable victim at risk',
            'critical_if_true': True,
        },
        {
            'id': 'injury_severity',
            'type': 'single_select',
            'label': 'Current injury severity at the scene?',
            'required': True,
            'options': [
                {'value': 'NONE', 'label': 'No injuries', 'score': 0},
                {'value': 'MINOR', 'label': 'Minor injuries', 'score': 8, 'factor': 'minor injuries'},
                {'value': 'SERIOUS', 'label': 'Serious injuries', 'score': 28, 'factor': 'serious injuries'},
                {
                    'value': 'CRITICAL_OR_FATAL',
                    'label': 'Critical injuries or fatalities',
                    'score': 65,
                    'factor': 'critical injuries or fatalities',
                    'critical': True,
                },
            ],
        },
    ],
    'ARMED_ROBBERY': [
        {
            'id': 'robbery_in_progress',
            'type': 'boolean',
            'label': 'Is the robbery currently in progress?',
            'required': True,
            'true_score': 35,
            'factor_true': 'robbery in progress',
        },
        {
            'id': 'suspects_armed',
            'type': 'boolean',
            'label': 'Are suspects armed?',
            'required': True,
            'true_score': 40,
            'factor_true': 'armed robbery suspects',
            'critical_if_true': True,
        },
        {
            'id': 'shots_fired',
            'type': 'boolean',
            'label': 'Have shots been fired?',
            'required': True,
            'true_score': 55,
            'factor_true': 'gunfire reported',
            'critical_if_true': True,
        },
        {
            'id': 'locations_affected',
            'type': 'single_select',
            'label': 'How many locations/shops are affected?',
            'required': True,
            'options': [
                {'value': 'ONE', 'label': '1', 'score': 10, 'factor': 'single location affected'},
                {'value': 'TWO_TO_THREE', 'label': '2\u20133', 'score': 22, 'factor': 'multiple locations affected'},
                {'value': 'FOUR_PLUS', 'label': '4 or more', 'score': 36, 'factor': 'coordinated multi-location robbery'},
            ],
        },
        {
            'id': 'injury_severity',
            'type': 'single_select',
            'label': 'Current injury severity at the scene?',
            'required': True,
            'options': [
                {'value': 'NONE', 'label': 'No injuries', 'score': 0},
                {'value': 'MINOR', 'label': 'Minor injuries', 'score': 10, 'factor': 'minor injuries'},
                {'value': 'SERIOUS', 'label': 'Serious injuries', 'score': 32, 'factor': 'serious injuries'},
                {
                    'value': 'CRITICAL_OR_FATAL',
                    'label': 'Critical injuries or fatalities',
                    'score': 65,
                    'factor': 'critical injuries or fatalities',
                    'critical': True,
                },
            ],
        },
    ],
    'ROBBERY': [
        {
            'id': 'robbery_in_progress',
            'type': 'boolean',
            'label': 'Is the robbery still in progress?',
            'required': True,
            'true_score': 26,
            'factor_true': 'active robbery in progress',
        },
        {
            'id': 'suspects_violent',
            'type': 'boolean',
            'label': 'Are suspects violent or threatening people?',
            'required': True,
            'true_score': 28,
            'factor_true': 'violent suspects reported',
        },
        {
            'id': 'suspect_count',
            'type': 'single_select',
            'label': 'How many suspects are involved?',
            'required': True,
            'options': [
                {'value': 'ONE', 'label': '1', 'score': 5, 'factor': 'single suspect'},
                {'value': 'TWO_TO_THREE', 'label': '2\u20133', 'score': 14, 'factor': 'multiple suspects'},
                {'value': 'FOUR_PLUS', 'label': '4 or more', 'score': 24, 'factor': 'organized suspect group'},
            ],
        },
        {
            'id': 'injury_severity',
            'type': 'single_select',
            'label': 'Current injury severity at the scene?',
            'required': True,
            'options': [
                {'value': 'NONE', 'label': 'No injuries', 'score': 0},
                {'value': 'MINOR', 'label': 'Minor injuries', 'score': 9, 'factor': 'minor injuries'},
                {'value': 'SERIOUS', 'label': 'Serious injuries', 'score': 30, 'factor': 'serious injuries'},
                {
                    'value': 'CRITICAL_OR_FATAL',
                    'label': 'Critical injuries or fatalities',
                    'score': 65,
                    'factor': 'critical injuries or fatalities',
                    'critical': True,
                },
            ],
        },
        {
            'id': 'victims_count',
            'type': 'single_select',
            'label': 'How many people are directly threatened?',
            'required': True,
            'options': [
                {'value': 'TWO_OR_FEWER', 'label': '2 or fewer', 'score': 5, 'factor': 'few people threatened'},
                {'value': 'THREE_TO_TEN', 'label': '3\u201310', 'score': 16, 'factor': 'several people threatened'},
                {'value': 'ELEVEN_PLUS', 'label': '11 or more', 'score': 28, 'factor': 'many people threatened'},
            ],
        },
    ],
    'ACCIDENT': [
        {
            'id': 'vehicles_involved',
            'type': 'single_select',
            'label': 'How many vehicles are involved?',
            'required': True,
            'options': [
                {'value': 'ONE', 'label': '1', 'score': 8, 'factor': 'single vehicle accident'},
                {'value': 'TWO_TO_THREE', 'label': '2\u20133', 'score': 20, 'factor': 'multi-vehicle accident'},
                {'value': 'FOUR_PLUS', 'label': '4 or more', 'score': 36, 'factor': 'major pile-up'},
            ],
        },
        {
            'id': 'people_injured_count',
            'type': 'single_select',
            'label': 'How many people are injured?',
            'required': True,
            'options': [
                {'value': 'NONE', 'label': 'None', 'score': 0},
                {'value': 'ONE_OR_TWO', 'label': '1\u20132', 'score': 12, 'factor': 'limited injuries'},
                {'value': 'THREE_TO_FIVE', 'label': '3\u20135', 'score': 26, 'factor': 'multiple injuries'},
                {'value': 'SIX_PLUS', 'label': '6 or more', 'score': 44, 'factor': 'mass casualty risk', 'critical': True},
            ],
        },
        {
            'id': 'people_trapped',
            'type': 'boolean',
            'label': 'Are people trapped in any vehicle?',
            'required': True,
            'true_score': 45,
            'factor_true': 'people trapped in vehicles',
            'critical_if_true': True,
        },
        {
            'id': 'hazardous_spill_or_fire',
            'type': 'boolean',
            'label': 'Is there fuel leakage, fire, or hazardous spill?',
            'required': True,
            'true_score': 45,
            'factor_true': 'hazardous spill or fire at accident scene',
            'critical_if_true': True,
        },
        {
            'id': 'injury_severity',
            'type': 'single_select',
            'label': 'Current injury severity at the scene?',
            'required': True,
            'options': [
                {'value': 'NONE', 'label': 'No injuries', 'score': 0},
                {'value': 'MINOR', 'label': 'Minor injuries', 'score': 10, 'factor': 'minor injuries'},
                {'value': 'SERIOUS', 'label': 'Serious injuries', 'score': 32, 'factor': 'serious injuries'},
                {
                    'value': 'CRITICAL_OR_FATAL',
                    'label': 'Critical injuries or fatalities',
                    'score': 70,
                    'factor': 'critical injuries or fatalities',
                    'critical': True,
                },
            ],
        },
    ],
    'OTHER': [
        {
            'id': 'threat_active',
            'type': 'boolean',
            'label': 'Is the threat still active?',
            'required': True,
            'true_score': 30,
            'factor_true': 'active threat not yet contained',
        },
        {
            'id': 'people_at_risk',
            'type': 'single_select',
            'label': 'How many people are at risk?',
            'required': True,
            'options': [
                {'value': 'TWO_OR_FEWER', 'label': '2 or fewer', 'score': 5},
                {'value': 'THREE_TO_TEN', 'label': '3\u201310', 'score': 15, 'factor': 'multiple people at risk'},
                {'value': 'ELEVEN_PLUS', 'label': '11 or more', 'score': 30, 'factor': 'large group at risk'},
            ],
        },
        {
            'id': 'critical_infrastructure_nearby',
            'type': 'boolean',
            'label': 'Is critical infrastructure affected (hospital, school, fuel station)?',
            'required': True,
            'true_score': 35,
            'factor_true': 'critical infrastructure exposure',
        },
        {
            'id': 'injury_severity',
            'type': 'single_select',
            'label': 'Current injury severity at the scene?',
            'required': True,
            'options': [
                {'value': 'NONE', 'label': 'No injuries', 'score': 0},
                {'value': 'MINOR', 'label': 'Minor injuries', 'score': 10, 'factor': 'minor injuries'},
                {'value': 'SERIOUS', 'label': 'Serious injuries', 'score': 28, 'factor': 'serious injuries'},
                {
                    'value': 'CRITICAL_OR_FATAL',
                    'label': 'Critical injuries or fatalities',
                    'score': 65,
                    'factor': 'critical injuries or fatalities',
                    'critical': True,
                },
            ],
        },
        {
            'id': 'threat_severity',
            'type': 'single_select',
            'label': 'Overall severity of this threat?',
            'required': True,
            'options': [
                {'value': 'LOW', 'label': 'Low', 'score': 0},
                {'value': 'MEDIUM', 'label': 'Medium', 'score': 15, 'factor': 'medium threat severity'},
                {'value': 'HIGH', 'label': 'High', 'score': 30, 'factor': 'high threat severity'},
            ],
        },
    ],
}


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        if value in (0, 1):
            return bool(value)
        raise ValueError('must be 0 or 1')
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in ('true', '1', 'yes', 'on'):
            return True
        if lowered in ('false', '0', 'no', 'off'):
            return False
    raise ValueError('must be a boolean')


def _normalize_alert_type(alert_type):
    normalized = str(alert_type or '').strip().upper()
    if normalized not in QUESTION_BANK:
        raise ValueError(f'Unsupported alert_type: {alert_type}')
    return normalized


def _question_public_schema(question):
    payload = {
        'id': question['id'],
        'type': question['type'],
        'label': question['label'],
        'required': bool(question.get('required', False)),
        'weight': question.get('weight', _question_weight(question)),
    }
    if 'min' in question:
        payload['min'] = question['min']
    if 'max' in question:
        payload['max'] = question['max']
    if question['type'] == 'single_select':
        payload['options'] = [
            {'value': option['value'], 'label': option['label']}
            for option in question['options']
        ]
    return payload


def _question_weight(question):
    if question['type'] == 'boolean':
        return max(question.get('true_score', 0), question.get('false_score', 0))
    if question['type'] == 'integer':
        return max((band.get('score', 0) for band in question.get('bands', [])), default=0)
    if question['type'] == 'single_select':
        return max((option.get('score', 0) for option in question.get('options', [])), default=0)
    return 0


def get_questions(alert_type):
    normalized = _normalize_alert_type(alert_type)
    return [_question_public_schema(question) for question in QUESTION_BANK[normalized]]


def validate_risk_answers(alert_type, risk_answers):
    normalized = _normalize_alert_type(alert_type)
    questions = QUESTION_BANK[normalized]

    if not isinstance(risk_answers, dict):
        raise RiskAnswerValidationError({'non_field_errors': ['risk_answers must be an object.']})

    cleaned = {}
    errors = {}

    for question in questions:
        qid = question['id']
        required = bool(question.get('required', False))
        if qid not in risk_answers or risk_answers[qid] in ('', None):
            if required:
                errors[qid] = ['This answer is required.']
            continue

        raw_value = risk_answers[qid]
        try:
            if question['type'] == 'boolean':
                cleaned[qid] = _parse_bool(raw_value)
            elif question['type'] == 'integer':
                int_value = int(raw_value)
                min_val = question.get('min')
                max_val = question.get('max')
                if min_val is not None and int_value < min_val:
                    raise ValueError(f'must be at least {min_val}')
                if max_val is not None and int_value > max_val:
                    raise ValueError(f'must be at most {max_val}')
                cleaned[qid] = int_value
            elif question['type'] == 'single_select':
                allowed = {option['value'] for option in question['options']}
                value = str(raw_value).strip().upper()
                if value not in allowed:
                    raise ValueError(f'must be one of: {", ".join(sorted(allowed))}')
                cleaned[qid] = value
            else:
                raise ValueError('unsupported question type')
        except (TypeError, ValueError) as exc:
            errors[qid] = [str(exc)]

    if errors:
        raise RiskAnswerValidationError(errors)

    return cleaned


def _score_integer_answer(question, value):
    for band in question.get('bands', []):
        min_val = band['min']
        max_val = band['max']
        if min_val <= value <= max_val:
            return band
    return {'score': 0}


def _priority_from_score(score):
    for level, threshold in SCORE_THRESHOLDS:
        if score >= threshold:
            return level
    return 'LOW'


def compute_priority(alert_type, risk_answers, answers_prevalidated=False):
    normalized = _normalize_alert_type(alert_type)
    cleaned_answers = deepcopy(risk_answers)
    if not answers_prevalidated:
        cleaned_answers = validate_risk_answers(normalized, cleaned_answers)

    score = BASE_SCORES[normalized]
    factors = []
    critical_reasons = []

    for question in QUESTION_BANK[normalized]:
        qid = question['id']
        if qid not in cleaned_answers:
            continue

        answer = cleaned_answers[qid]
        if question['type'] == 'boolean':
            if answer:
                question_score = question.get('true_score', 0)
                score += question_score
                if question.get('factor_true'):
                    factors.append({'id': qid, 'reason': question['factor_true'], 'score': question_score})
                if question.get('critical_if_true'):
                    critical_reasons.append(question['label'])
            else:
                score += question.get('false_score', 0)
        elif question['type'] == 'integer':
            matched = _score_integer_answer(question, answer)
            question_score = matched.get('score', 0)
            score += question_score
            if matched.get('factor'):
                factors.append({'id': qid, 'reason': matched['factor'], 'score': question_score})
            if matched.get('critical'):
                critical_reasons.append(question['label'])
        elif question['type'] == 'single_select':
            options = {option['value']: option for option in question['options']}
            matched = options[answer]
            question_score = matched.get('score', 0)
            score += question_score
            if matched.get('factor'):
                factors.append({'id': qid, 'reason': matched['factor'], 'score': question_score})
            if matched.get('critical'):
                critical_reasons.append(question['label'])

    priority_level = 'CRITICAL' if critical_reasons else _priority_from_score(score)
    return {
        'priority_level': priority_level,
        'score': score,
        'factors': factors,
        'critical_reasons': critical_reasons,
    }
