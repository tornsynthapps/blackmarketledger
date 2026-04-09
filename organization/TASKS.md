- [ ] Update trade wrapper to show username. Make username, trade ID, and receipt ID clickable.
- [ ] Show rounded values for profit in sell logs.
- [ ] Show total amount in log wrappers.
- [ ] New function to recalculate cost-basis of all items.
- [ ] Auto-set pricelist from the Museum.
- [ ] Other exchanges not working. -- make a unified version.
- [ ] In new account verification, it says BML account. Change it to PixelGhost.
- [ ] Buy Mode

# TASK PLANS

## (April 09, 2026) Fix Buy Mode
In Musuem Buy Mode, (a) remove Effort and all that suff. Instead ask for number of different items user wants to buy. If user says one, take the item with least amount and let user know the amount he can buy to maximaze sets. (b) Move Buy Mode to sets table itself and not at the top. 

Example:
Sheep Plushie: 203
Teddy Bear Plushie: 385
Kitten Plushie: 5
Jaguar Plushie: 155
Wolverine Plushie: 19
Nessie Plushie: 27
Red Fox Plushie: 1736
Monkey Plushie: 392
Chamois Plushie: 30
Panda Plushie: 212
Lion Plushie: 326
Camel Plushie: 1908
Stingray Plushie: 408

With Different Items = 1, Least = Kitten Plushie, Amount = 5, Second Least = Wolverine Plushie, Amount = 19. So, show the user to buy (19 - 5 = 14) of Kitten Plushie.
With Different Items = 3, Least = Kitten Plushie, Amount = 5, Second Least = Wolverine Plushie, Amount = 19, Third Least = Nessie Plushie, Amount = 27, Fourth Least = Chamois Plushie, Amount = 30. So, show the user to buy (30 - 5 = 25) of Kitten Plushie, (30 -19 = 11) of Wolverine Plushie, (30 - 27 = 3) of Nessie Plushie.
