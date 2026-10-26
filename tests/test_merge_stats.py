import contextlib
import copy
import io
import json
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from scripts import merge_stats as pipeline

DATA_DIR = Path(__file__).resolve().parents[1] / 'public' / 'data'


class DataPipelineTests(unittest.TestCase):
    def setUp(self):
        self.rows = pipeline.read_csv(DATA_DIR / 'stats.csv', pipeline.STATS_COLUMNS)

    def test_current_data_has_full_coverage(self):
        report = pipeline.validate(self.rows, DATA_DIR)
        self.assertEqual(report['rows'], 220)
        self.assertEqual(report['expected'], 220)
        self.assertEqual(report['missing'], 0)
        self.assertEqual(report['densities_checked'], 110)
        self.assertEqual(report['years'], list(range(2016, 2026)))

    def test_invalid_csv_schema_or_column_count_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'stats.csv'
            for text in ['adcode,year,value\n330100,2016,1\n', 'adcode,year,indicator,value\n330100,2016,pop_resident\n']:
                path.write_text(text, encoding='utf-8')
                with self.assertRaises(ValueError):
                    pipeline.read_csv(path, pipeline.STATS_COLUMNS)

    def test_bad_codes_unknown_indicators_and_years_are_rejected(self):
        for field, value in [('adcode', '33010'), ('adcode', '330999'), ('adcode', '330000'), ('indicator', 'gdp'), ('year', '2016.0')]:
            with self.subTest(field=field, value=value):
                rows = copy.deepcopy(self.rows)
                rows[0][field] = value
                with self.assertRaises(ValueError):
                    pipeline.validate(rows, DATA_DIR)

    def test_duplicate_primary_key_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'duplicate primary key'):
            pipeline.validate(self.rows + [self.rows[0]], DATA_DIR)

    def test_blank_placeholders_and_nonfinite_values_are_rejected(self):
        for value in ['', '-', 'null', 'NaN', 'Infinity']:
            with self.subTest(value=value):
                rows = copy.deepcopy(self.rows)
                rows[0]['value'] = value
                with self.assertRaises(ValueError):
                    pipeline.validate(rows, DATA_DIR)

    def test_density_tolerance_accepts_boundary_and_rejects_excess(self):
        rows = copy.deepcopy(self.rows)
        expected = Decimal('918.8') * 10000 / Decimal('16873.5')
        rows[1]['value'] = str(expected + Decimal('0.1'))
        pipeline.validate(rows, DATA_DIR)
        rows[1]['value'] = str(expected + Decimal('0.1001'))
        with self.assertRaisesRegex(ValueError, 'more than 0.1'):
            pipeline.validate(rows, DATA_DIR)

    def test_missing_density_is_reported_without_filling_zero(self):
        rows = [row for row in self.rows if row is not self.rows[1]]
        report = pipeline.validate(rows, DATA_DIR)
        self.assertEqual(report['missing'], 1)
        self.assertEqual(report['rows'], 219)
        with self.assertRaisesRegex(ValueError, 'population required'):
            pipeline.validate(self.rows[1:], DATA_DIR)

    def test_missing_boundary_and_numeric_codes_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            data_dir = Path(temporary)
            (data_dir / 'geo').mkdir()
            for filename in ['regions.csv', 'indicators.csv']:
                (data_dir / filename).write_bytes((DATA_DIR / filename).read_bytes())
            original = json.loads((DATA_DIR / 'geo/zhejiang_city.json').read_text(encoding='utf-8'))
            for mode in ['missing', 'numeric']:
                geojson = copy.deepcopy(original)
                if mode == 'missing':
                    geojson['features'].pop()
                else:
                    geojson['features'][0]['properties']['adcode'] = 330100
                (data_dir / 'geo/zhejiang_city.json').write_text(json.dumps(geojson), encoding='utf-8')
                with self.assertRaises(ValueError):
                    pipeline.validate(self.rows, data_dir)

    def test_merge_multiple_inputs_and_failure_preserves_previous_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            temporary = Path(temporary)
            sources = [temporary / 'first.csv', temporary / 'second.csv']
            pipeline.write_stats(self.rows[:100], sources[0])
            pipeline.write_stats(self.rows[100:], sources[1])
            output = temporary / 'merged.csv'
            args = ['--data-dir', str(DATA_DIR), '--input', *map(str, sources), '--output', str(output)]
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(pipeline.main(args), 0)
            original = output.read_bytes()
            self.assertEqual(pipeline.validate(pipeline.read_csv(output, pipeline.STATS_COLUMNS), DATA_DIR)['rows'], 220)
            pipeline.write_stats([self.rows[0], self.rows[0]], sources[1])
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(pipeline.main(args), 1)
            self.assertEqual(output.read_bytes(), original)

    def test_check_mode_does_not_write_statistics(self):
        original = (DATA_DIR / 'stats.csv').read_bytes()
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(pipeline.main(['--check', '--data-dir', str(DATA_DIR)]), 0)
        self.assertEqual((DATA_DIR / 'stats.csv').read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
