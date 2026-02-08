import json
import re
import os
import datetime

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data.json')
INDEX_FILE = os.path.join(BASE_DIR, 'index.html')

class PulseUpdater:
    def __init__(self):
        self.data = self.load_data()

    def load_data(self):
        """Loads data from the central JSON source."""
        if not os.path.exists(DATA_FILE):
            print(f"Error: {DATA_FILE} not found.")
            return {}
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)

    def scan_full_debt(self):
        """
        Scans for debt values.
        Currently pulls from data.json, but designed to be extended 
        to scan markdown notes or comment tags in the future.
        """
        # Placeholder for complex scanning logic (Values + Notes + Comments)
        # For now, trust data.json as the source of truth
        debt_data = self.data.get('debt', {})
        current = debt_data.get('current', 0)
        total = debt_data.get('total', 300)
        
        # Calculate progress
        progress = (current / total) * 100 if total > 0 else 0
        
        return {
            'current': current,
            'total': total,
            'progress': round(progress, 1),
            'global': debt_data.get('global', '8.98M')
        }

    def update_index_html(self, debt_info):
        """Updates the HTML file with new debt statistics."""
        if not os.path.exists(INDEX_FILE):
            print(f"Error: {INDEX_FILE} not found.")
            return

        with open(INDEX_FILE, 'r', encoding='utf-8') as f:
            content = f.read()

        # Update Current Value (e.g., 28.65k)
        # Regex to find: <div class="big-number" ...>28.65<span class="unit">k</span>
        # We look for the pattern before and after the number
        
        # 1. Update Progress Bar Width
        # Pattern: <div class="bar" style="width: 9.5%"></div>
        content = re.sub(
            r'(<div class="bar" style="width: )[\d\.]+%',
            f'\\g<1>{debt_info["progress"]}%',
            content
        )

        # 2. Update Progress Text
        # Pattern: <span>9.5%</span>
        # We target the specific span in the sub-text area for progress
        # This is a bit risky with regex, looking for "Прогресс Q1" context could be safer
        # But based on the file structure, replacing matching percentage string near "Прогресс Q1" is best.
        
        # Update Value: 28.65<span
        # Pattern: >[\d\.]+<span class="unit">k</span>
        content = re.sub(
            r'>[\d\.]+(<span class="unit">k</span>)',
            f'>{debt_info["current"]}\\1',
            content
        )
        
        # Update Percentage Text
        # Find the block containing "Прогресс Q1" and update the percentage inside it
        # This regex looks for the label and then the next span content
        content = re.sub(
            r'(<span>Прогресс Q1</span>\s*<span>)[\d\.]+(%</span>)',
            f'\\g<1>{debt_info["progress"]}\\2',
            content
        )
        
        # Update Comment
        # Pattern: <!-- .*k / 300k = .* -->
        content = re.sub(
            r'<!-- [\d\.]+k / 300k = [\d\.]+% -->',
            f'<!-- {debt_info["current"]}k / {debt_info["total"]}k = {debt_info["progress"]}% -->',
            content
        )

        with open(INDEX_FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Successfully updated index.html with Debt: {debt_info['current']}k ({debt_info['progress']}%)")

    def run(self):
        print("Starting Pulse Update...")
        debt_info = self.scan_full_debt()
        print(f"Scanned Debt Data: {debt_info}")
        self.update_index_html(debt_info)
        print("Update Complete.")

if __name__ == "__main__":
    updater = PulseUpdater()
    updater.run()
