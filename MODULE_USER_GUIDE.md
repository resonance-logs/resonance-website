# Module Optimizer User Guide

Welcome to the Module Optimizer! This tool helps you find the best 4-module equipment combinations from your collection.

## Quick Start

### 1. Import Your Modules

First, you need to add modules to your collection:

**Option A: Import from JSON File**
1. Go to **Module Management** page
2. Click **"Import Modules"** button
3. Select your module data JSON file
4. Review the import summary (added/updated/errors)

**Option B: Add Manually**
1. Go to **Module Management** page
2. Click **"Add Module"** button
3. Fill in the module details:
   - Name
   - Category (Attack/Defense/Support)
   - Quality (1-5 stars)
   - Attributes (parts)
4. Click **"Save"**

### 2. Run Optimization

Once you have at least 4 modules:

1. Go to the **Module Optimizer** page
2. Select a **Category** (Attack, Defense, or Support)
3. Set **Max Solutions** (how many combinations to return)
4. Choose **Sort Mode**:
   - **By Score**: Ranks by combat power
   - **By Total Attributes**: Ranks by sum of all attribute values
5. Click **"Optimize"**

Results will show within 2 seconds (typically faster).

### 3. View Results

The results display will show:
- **Rank**: Position in the ranking
- **Score**: Combat power value
- **Modules**: The 4 modules in this combination
- **Attributes**: Breakdown of total attribute values

Click on a result to expand and see full details.

## Advanced Features

### Priority Attributes

Want to reach specific attribute levels? Use the **Advanced Settings**:

1. Click **"Show Advanced Settings"**
2. Add a **Priority Attribute** (e.g., "Attack Power")
3. Set **Desired Level** (1-6)
4. Add more priority attributes if needed
5. Click **"Optimize"**

The optimizer will prioritize combinations that meet your target levels.

**Example**: "I want Attack Power Level 5 and Critical Rate Level 3"
- Solutions that achieve both levels will rank higher
- Solutions that exceed levels significantly will be penalized (wasted attributes)

### Save Favorite Builds

Found a great combination? Save it for later:

1. In the results list, find a combination you like
2. Click **"Save Build"** button
3. Enter a **Name** (e.g., "Boss Fight Build")
4. Optionally add **Notes**
5. Click **"Save"**

Access your saved builds from the **Saved Builds** page.

### View Optimization History

Want to review past optimizations?

1. Go to **History** page
2. See all your past optimization attempts
3. Click on an entry to view the results
4. Delete old entries if needed

History is automatically saved for 90 days.

## Understanding the Results

### Combat Power Score

The **score** is calculated based on:
- **Attribute Levels**: Higher levels give more power
  - Level 1: threshold at 1 point
  - Level 2: threshold at 4 points
  - Level 3: threshold at 8 points
  - Level 4: threshold at 12 points
  - Level 5: threshold at 16 points
  - Level 6: threshold at 20 points

- **Attribute Types**:
  - **Basic Attributes**: Normal power multiplier
  - **Special Attributes**: 2x power multiplier

- **Total Attributes**: Bonus for having more unique attributes

- **Priority Bonus**: Extra score for meeting desired levels

### Attribute Levels Explained

Attribute levels represent thresholds of power:
- **Level 1-2**: Early game, minimal impact
- **Level 3-4**: Mid game, noticeable impact
- **Level 5**: End game, significant impact
- **Level 6**: Maximum, exceptional impact

### Priority Level

When using priority attributes, the **Priority Level** shows the lowest level achieved among your priority attributes.

**Example**: Priority attributes are "Attack Power" and "Critical Rate"
- If Attack Power reaches Level 5 and Critical Rate reaches Level 3
- Priority Level = 3 (the lower of the two)

## Tips & Best Practices

### For Best Results

1. **Import all your modules first**: More modules = better optimization
2. **Use appropriate category**: Don't mix Attack and Defense modules
3. **Set realistic desired levels**: Don't aim for Level 6 on everything
4. **Try different priority combinations**: Experiment to find your playstyle
5. **Save multiple builds**: Keep options for different scenarios

### Performance Notes

- **<50 modules**: Instant results (<500ms)
- **50-200 modules**: Fast results (<2s)
- **200-500 modules**: Acceptable results (<5s)
- **500+ modules**: May take longer, but uses caching

Optimization results are cached for 1 hour, so re-running the same search is instant!

### Module Management Tips

- **Regular imports**: Export and re-import when you get new modules
- **Clean up old modules**: Delete modules you no longer use
- **Use quality stars**: Higher quality = better attributes
- **Check attribute types**: Special attributes are more valuable

## Troubleshooting

### "Insufficient Modules" Error

**Problem**: You don't have at least 4 modules in the selected category

**Solution**:
1. Add more modules to your collection
2. Try a different category
3. Import modules from a JSON file

### "No Results Found"

**Problem**: No valid 4-module combinations exist

**Solution**:
1. Check if you have at least 4 modules
2. Remove restrictive filters
3. Try different priority attributes

### "Optimization Taking Too Long"

**Problem**: Large collection (1000+ modules)

**Solution**:
1. Wait a bit longer (up to 10 seconds)
2. Reduce max solutions to 10 or less
3. Use caching: run the same search again for instant results

### "Import Failed"

**Problem**: Invalid JSON format or module data

**Solution**:
1. Verify JSON file format matches the schema
2. Check that quality values are 1-5
3. Ensure category is ATTACK, DEFENSE, or SUPPORT
4. Review error messages for specific issues

## FAQ

### Q: How does the algorithm work?

**A**: The optimizer uses a hybrid approach:
1. **Pre-filtering**: Selects top modules per attribute
2. **Greedy Construction**: Builds initial combinations
3. **Local Search**: Improves solutions by swapping modules
4. **Ranking**: Sorts by combat power or total attributes

This is the same algorithm used in the StarResonanceDps desktop application.

### Q: Can I optimize for multiple categories at once?

**A**: No, you must select one category (Attack, Defense, or Support) per optimization. This ensures meaningful comparisons.

### Q: How accurate is the combat power calculation?

**A**: The algorithm matches the desktop version within 0.1% accuracy. Combat power is calculated using the same formulas and thresholds.

### Q: Why do some combinations have the same score?

**A**: Multiple combinations can have identical scores if they achieve the same attribute levels. This is expected and correct.

### Q: Can I edit saved builds?

**A**: You can edit the **name** and **notes** of a saved build, but not the module combination itself. To change modules, create a new build.

### Q: How long are optimization results kept?

**A**: Optimization history is kept for 90 days. Saved builds are kept indefinitely unless you delete them.

## Keyboard Shortcuts

- **Ctrl/Cmd + Enter**: Run optimization (when on optimizer page)
- **Ctrl/Cmd + S**: Save current result as build
- **Ctrl/Cmd + M**: Go to module management
- **Ctrl/Cmd + H**: Go to history

## Support

Need help? Have a question?

- Check this guide for common issues
- Review the [Quick Start Guide](../quickstart.md) for API usage
- Refer to the [API Documentation](../contracts/openapi.yaml) for technical details

## Version

This guide corresponds to Module Optimizer v1.0

**Last Updated**: 2025-11-12
