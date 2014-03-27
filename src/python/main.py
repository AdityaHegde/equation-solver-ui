import os
import urllib
import json

from google.appengine.api import users
from google.appengine.ext import ndb

import logging
import webapp2

def convert_query_to_dict(query):
    return [e.to_dict() for e in query]

def delete_from_query(query):
    for e in query:
        e.key.delete()

class PersonEvent(ndb.Model):
    eventId = ndb.StringProperty()
    owes = ndb.FloatProperty()
    owed = ndb.FloatProperty()

class Person(ndb.Model):
    id = ndb.StringProperty()
    name = ndb.StringProperty()
    owes = ndb.FloatProperty()
    owed = ndb.FloatProperty()
    events = ndb.StructuredProperty(PersonEvent, repeated=True)

class PersonAttended(ndb.Model):
    name = ndb.StringProperty()
    toPay = ndb.FloatProperty()
    paid = ndb.GenericProperty()
    eventId = ndb.StringProperty()

class Event(ndb.Model):
    id = ndb.StringProperty()
    name = ndb.StringProperty()
    amt = ndb.GenericProperty()
    peopleAttended = ndb.StructuredProperty(PersonAttended, repeated=True)

def get_outing_details(outingName):
    outingKey = ndb.Key('Outing', outingName)
    return {
      "name" : outingName,
      "people" : convert_query_to_dict(Person.query(ancestor=outingKey).fetch()),
      "events" : convert_query_to_dict(Event.query(ancestor=outingKey).fetch())
    }

def save_new_delete_old_query(model, newData, query, key):
    dataMap = {}
    logging.warning(model)
    for dat in newData:
        obj = model.query(model.id == dat['id'], ancestor=key).get()
        if not obj:
            logging.warning("creating obj")
            logging.warning(dat)
            obj = model(parent=key)
        else:
            logging.warning("obj found")
            logging.warning(obj)
            dataMap[dat['id']] = 1
        obj.populate(**dat)
        obj.put()

    for e in query:
        if not dataMap[e.id]:
            e.key.delete()

def save_outing_details(outingData):
    outingKey = ndb.Key('Outing', outingData['outingName'])
    save_new_delete_old_query(Person, outingData['people'], Person.query(ancestor=outingKey).fetch(), outingKey)
    save_new_delete_old_query(Event, outingData['events'], Event.query(ancestor=outingKey).fetch(), outingKey)

class MainPage(webapp2.RequestHandler):

    def get(self):
        self.redirect("/public/index.html")


class DataRequest(webapp2.RequestHandler):

    def get(self):
        self.response.headers['Content-Type'] = 'application/json' 
        self.response.out.write(json.dumps(get_outing_details(self.request.get('outingName'))))

    def post(self):
        outingData = json.loads(self.request.POST['outingData'])
        logging.warning(outingData)
        save_outing_details(outingData)
        self.response.headers['Content-Type'] = 'application/json' 
        self.response.out.write(json.dumps({"status" : "success"}))


app = webapp2.WSGIApplication([
    ('/data', DataRequest),
    ('/', MainPage),
], debug=True)
